package com.businessexchange.inquiry.controller;

import com.businessexchange.common.response.ApiResponse;
import com.businessexchange.inquiry.dto.MessageResponse;
import com.businessexchange.inquiry.dto.MessageSendRequest;
import com.businessexchange.inquiry.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inquiries/{inquiryId}/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    // No @PreAuthorize role check here on purpose: both BUYER and SELLER hit this
    // endpoint, and membership on the specific inquiry is enforced inside the service.
    @PostMapping
    public ApiResponse<MessageResponse> sendMessage(
            @PathVariable Long inquiryId,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody MessageSendRequest request) {
        MessageResponse response = messageService.sendMessage(inquiryId, userDetails.getUsername(), request);
        return ApiResponse.success("Message sent successfully", response);
    }

    @GetMapping
    public ApiResponse<List<MessageResponse>> getMessages(
            @PathVariable Long inquiryId,
            @AuthenticationPrincipal UserDetails userDetails) {
        List<MessageResponse> response = messageService.getMessages(inquiryId, userDetails.getUsername());
        return ApiResponse.success("Messages fetched successfully", response);
    }
}
