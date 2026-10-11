package com.businessexchange.deal.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DealResponse {

    private Long id;
    private Long businessId;
    private String businessTitle;
    private Long buyerId;
    private String buyerName;
    private String buyerEmail;
    private Long sellerId;
    private String sellerName;
    private String sellerEmail;
    private Long offerId;
    private BigDecimal agreedPrice;
    private String currency;
    private String status;
    private LocalDateTime buyerConfirmedAt;
    private LocalDateTime sellerConfirmedAt;
    private Long cancellationRequestedBy;
    private String cancellationRequestedByName;
    private String cancellationReason;
    private LocalDateTime cancellationRequestedAt;
    private boolean cancellationPending;
    private String notes;
    private LocalDateTime closedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String completionNotice;
}
