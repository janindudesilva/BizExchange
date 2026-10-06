package com.businessexchange.support.service;

import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.support.dto.*;
import com.businessexchange.support.entity.SupportTicket;
import com.businessexchange.support.entity.TicketMessage;
import com.businessexchange.support.entity.TicketPriority;
import com.businessexchange.support.entity.TicketStatus;
import com.businessexchange.support.repository.SupportTicketRepository;
import com.businessexchange.support.repository.TicketMessageRepository;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final SupportTicketRepository ticketRepository;
    private final TicketMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public TicketResponse create(TicketCreateRequest request, Long createdById) {
        User createdBy = userRepository.findById(createdById)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        SupportTicket ticket = SupportTicket.builder()
                .createdBy(createdBy)
                .subject(request.getSubject())
                .description(request.getDescription())
                .status(TicketStatus.OPEN)
                .priority(request.getPriority() != null ? request.getPriority() : TicketPriority.MEDIUM)
                .build();

        SupportTicket saved = ticketRepository.save(ticket);
        return mapToResponse(saved);
    }

    public List<TicketResponse> findByCreatedBy(Long createdById) {
        return ticketRepository.findByCreatedByIdOrderByCreatedAtDesc(createdById)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<TicketResponse> findAssignedTo(Long assignedToId) {
        return ticketRepository.findByAssignedToIdOrderByCreatedAtDesc(assignedToId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public List<TicketResponse> findAll() {
        return ticketRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private void checkTicketAccess(SupportTicket ticket, User user) {
        if (user.getRole() == UserRole.ADMIN) {
            return;
        }
        if (user.getRole() == UserRole.SUPPORT_AGENT) {
            // Support agents can access tickets assigned to them or unassigned tickets
            if (ticket.getAssignedTo() == null || ticket.getAssignedTo().getId().equals(user.getId())) {
                return;
            }
        }
        if (ticket.getCreatedBy().getId().equals(user.getId())) {
            return;
        }
        throw new org.springframework.security.access.AccessDeniedException("You are not authorized to access this support ticket");
    }

    @Transactional
    public TicketMessageResponse reply(Long ticketId, String message, Long senderId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        checkTicketAccess(ticket, sender);

        TicketMessage ticketMessage = TicketMessage.builder()
                .ticket(ticket)
                .sender(sender)
                .message(message)
                .build();

        TicketMessage saved = messageRepository.save(ticketMessage);

        // Notify the other party
        User recipient = senderId.equals(ticket.getCreatedBy().getId()) 
                ? ticket.getAssignedTo() 
                : ticket.getCreatedBy();
        
        if (recipient != null) {
            notificationService.notify(
                    recipient,
                    "TICKET_REPLY",
                    "New reply on ticket: " + ticket.getSubject(),
                    "/support/my-tickets/" + ticketId
            );
        }

        return mapToMessageResponse(saved);
    }

    @Transactional
    public TicketResponse updateStatus(Long ticketId, TicketStatus status) {
        return updateStatus(ticketId, status, null);
    }

    @Transactional
    public TicketResponse updateStatus(Long ticketId, TicketStatus status, Long agentId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        if (agentId != null) {
            User agent = userRepository.findById(agentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Agent not found"));
            checkTicketAccess(ticket, agent);
        }

        ticket.setStatus(status);
        SupportTicket saved = ticketRepository.save(ticket);

        return mapToResponse(saved);
    }

    @Transactional
    public void escalateToAdmin(Long ticketId, String reason) {
        escalateToAdmin(ticketId, reason, null);
    }

    @Transactional
    public void escalateToAdmin(Long ticketId, String reason, Long agentId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        if (agentId != null) {
            User agent = userRepository.findById(agentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Agent not found"));
            checkTicketAccess(ticket, agent);
        }

        ticket.setStatus(TicketStatus.ESCALATED);
        ticketRepository.save(ticket);

        // Notify all admins
        List<User> admins = userRepository.findByRole(UserRole.ADMIN);
        for (User admin : admins) {
            notificationService.notify(
                    admin,
                    "TICKET_ESCALATED",
                    "Ticket escalated: " + ticket.getSubject() + " - Reason: " + reason,
                    "/admin/tickets/" + ticketId
            );
        }
    }

    @Transactional
    public void assign(Long ticketId, Long agentId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ResourceNotFoundException("Agent not found"));

        if (agent.getRole() != UserRole.SUPPORT_AGENT && agent.getRole() != UserRole.ADMIN) {
            throw new IllegalArgumentException("Assigned user must be a SUPPORT_AGENT or ADMIN");
        }

        ticket.setAssignedTo(agent);
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        ticketRepository.save(ticket);

        // Notify the agent
        notificationService.notify(
                agent,
                "TICKET_ASSIGNED",
                    "New ticket assigned: " + ticket.getSubject(),
                "/agent/tickets/" + ticketId
        );
    }

    public TicketResponse getTicketWithMessages(Long ticketId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
        return mapToResponse(ticket);
    }

    public TicketResponse getTicketWithMessages(Long ticketId, Long userId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            checkTicketAccess(ticket, user);
        }
        return mapToResponse(ticket);
    }

    public List<TicketMessageResponse> getTicketMessages(Long ticketId) {
        return getTicketMessages(ticketId, null);
    }

    public List<TicketMessageResponse> getTicketMessages(Long ticketId, Long userId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));
        if (userId != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found"));
            checkTicketAccess(ticket, user);
        }
        return messageRepository.findByTicketIdOrderByCreatedAtAsc(ticketId)
                .stream()
                .map(this::mapToMessageResponse)
                .toList();
    }

    private TicketResponse mapToResponse(SupportTicket ticket) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .ticketNumber(ticket.getTicketNumber())
                .createdById(ticket.getCreatedBy().getId())
                .createdByName(ticket.getCreatedBy().getFullName())
                .createdByEmail(ticket.getCreatedBy().getEmail())
                .assignedToId(ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null)
                .assignedToName(ticket.getAssignedTo() != null ? ticket.getAssignedTo().getFullName() : null)
                .subject(ticket.getSubject())
                .description(ticket.getDescription())
                .status(ticket.getStatus())
                .priority(ticket.getPriority())
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .build();
    }

    private TicketMessageResponse mapToMessageResponse(TicketMessage message) {
        return TicketMessageResponse.builder()
                .id(message.getId())
                .ticketId(message.getTicket().getId())
                .senderId(message.getSender().getId())
                .senderName(message.getSender().getFullName())
                .message(message.getMessage())
                .createdAt(message.getCreatedAt())
                .build();
    }
}
