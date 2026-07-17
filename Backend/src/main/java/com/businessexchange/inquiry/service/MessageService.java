package com.businessexchange.inquiry.service;

import com.businessexchange.common.exception.InvalidInquiryStateException;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.inquiry.dto.MessageResponse;
import com.businessexchange.inquiry.dto.MessageSendRequest;
import com.businessexchange.inquiry.entity.Inquiry;
import com.businessexchange.inquiry.entity.InquiryStatus;
import com.businessexchange.inquiry.entity.Message;
import com.businessexchange.inquiry.repository.InquiryRepository;
import com.businessexchange.inquiry.repository.MessageRepository;
import com.businessexchange.notification.service.NotificationService;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final InquiryRepository inquiryRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public MessageResponse sendMessage(Long inquiryId, String senderEmail, MessageSendRequest request) {
        User sender = userRepository.findByEmail(senderEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inquiry not found"));

        boolean isBuyer = inquiry.getBuyer().getId().equals(sender.getId());
        boolean isSeller = inquiry.getSeller().getId().equals(sender.getId());
        if (!isBuyer && !isSeller) {
            throw new AccessDeniedException("You are not part of this inquiry");
        }

        if (inquiry.getStatus() == InquiryStatus.PENDING_APPROVAL) {
            throw new InvalidInquiryStateException(
                    "The seller hasn't approved this inquiry yet — you can't send another message until they respond");
        }
        if (inquiry.getStatus() != InquiryStatus.ACTIVE) {
            throw new InvalidInquiryStateException("This conversation is closed");
        }

        Message message = Message.builder()
                .inquiry(inquiry)
                .sender(sender)
                .message(request.getMessage())
                .isRead(false)
                .build();

        Message saved = messageRepository.save(message);

        // Notify the other party about the new message
        Long recipientId = isBuyer ? inquiry.getSeller().getId() : inquiry.getBuyer().getId();
        notificationService.createNotification(
                recipientId,
                "New Message",
                String.format("You have a new message regarding: %s", inquiry.getBusiness().getTitle())
        );

        return mapToResponse(saved);
    }

    @Transactional
    public List<MessageResponse> getMessages(Long inquiryId, String requesterEmail) {
        User requester = userRepository.findByEmail(requesterEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new ResourceNotFoundException("Inquiry not found"));

        boolean isBuyer = inquiry.getBuyer().getId().equals(requester.getId());
        boolean isSeller = inquiry.getSeller().getId().equals(requester.getId());
        if (!isBuyer && !isSeller) {
            throw new AccessDeniedException("You are not part of this inquiry");
        }

        List<Message> messages = messageRepository.findByInquiryIdOrderByCreatedAtAsc(inquiryId);

        // mark the other party's messages as read since the requester is viewing the thread now
        messages.stream()
                .filter(m -> !m.getSender().getId().equals(requester.getId()) && !m.getIsRead())
                .forEach(m -> m.setIsRead(true));

        return messages.stream().map(this::mapToResponse).toList();
    }

    private MessageResponse mapToResponse(Message m) {
        return MessageResponse.builder()
                .id(m.getId())
                .inquiryId(m.getInquiry().getId())
                .senderId(m.getSender().getId())
                .senderName(m.getSender().getFullName())
                .message(m.getMessage())
                .isRead(m.getIsRead())
                .createdAt(m.getCreatedAt())
                .build();
    }
}
