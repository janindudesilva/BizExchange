package com.businessexchange.support.service;

import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.support.dto.*;
import com.businessexchange.support.entity.SupportTicket;
import com.businessexchange.support.entity.TicketMessage;
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

    @Transactional
    public TicketMessageResponse reply(Long ticketId, String message, Long senderId) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

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
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        ticket.setStatus(status);
        SupportTicket saved = ticketRepository.save(ticket);

        return mapToResponse(saved);
    }

    @Transactional
    public void escalateToAdmin(Long ticketId, String reason) {
        SupportTicket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

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

    private TicketResponse mapToResponse(SupportTicket ticket) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .createdById(ticket.getCreatedBy().getId())
                .createdByName(ticket.getCreatedBy().getFullName())
                .createdByEmail(ticket.getCreatedBy().getEmail())
                .assignedToId(ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null)
                .assignedToName(ticket.getAssignedTo() != null ? ticket.getAssignedTo().getFullName() : null)
                .subject(ticket.getSubject())
                .description(ticket.getDescription())
                .status(ticket.getStatus())
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
