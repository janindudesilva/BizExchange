package com.businessexchange.business.service;

import com.businessexchange.business.dto.BusinessFileResponse;
import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessFile;
import com.businessexchange.business.repository.BusinessFileRepository;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.exception.ResourceNotFoundException;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BusinessFileService {

    private final BusinessFileRepository fileRepository;
    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;

    private static final int MAX_FILES_PER_REQUEST = 10;
    private static final long MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

    @Transactional
    public List<BusinessFileResponse> uploadFiles(
            Long businessId,
            List<MultipartFile> images,
            List<MultipartFile> documents,
            List<MultipartFile> financialReports
    ) throws IOException {
        return uploadFiles(businessId, images, documents, financialReports, null);
    }

    @Transactional
    public List<BusinessFileResponse> uploadFiles(
            Long businessId,
            List<MultipartFile> images,
            List<MultipartFile> documents,
            List<MultipartFile> financialReports,
            String callerEmail
    ) throws IOException {
        if (callerEmail == null) {
            throw new AccessDeniedException("Authentication required to upload files");
        }

        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        User caller = userRepository.findByEmail(callerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Caller user not found"));
        boolean isAdmin = caller.getRole() == UserRole.ADMIN;
        boolean isOwner = business.getSeller().getEmail().equals(callerEmail);
        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException("You do not have permission to upload files for this business");
        }

        int totalFiles = (images != null ? images.size() : 0)
                + (documents != null ? documents.size() : 0)
                + (financialReports != null ? financialReports.size() : 0);

        if (totalFiles > MAX_FILES_PER_REQUEST) {
            throw new IllegalArgumentException("Maximum of " + MAX_FILES_PER_REQUEST + " files can be uploaded per request");
        }

        if (images != null) {
            for (MultipartFile file : images) saveFile(business, file, BusinessFile.FileType.IMAGE);
        }
        if (documents != null) {
            for (MultipartFile file : documents) saveFile(business, file, BusinessFile.FileType.DOCUMENT);
        }
        if (financialReports != null) {
            for (MultipartFile file : financialReports) saveFile(business, file, BusinessFile.FileType.FINANCIAL_REPORT);
        }

        // Reset approved business to PENDING_REVIEW so newly uploaded files undergo admin verification
        if (business.getStatus() == com.businessexchange.business.entity.BusinessStatus.APPROVED) {
            business.setStatus(com.businessexchange.business.entity.BusinessStatus.PENDING_REVIEW);
            businessRepository.save(business);
        }

        return getFilesForBusiness(businessId, callerEmail);
    }

    private void saveFile(Business business, MultipartFile file, BusinessFile.FileType type) throws IOException {
        if (file == null || file.isEmpty()) {
            return;
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException("File " + file.getOriginalFilename() + " exceeds maximum allowed size of 15MB");
        }

        byte[] bytes = file.getBytes();
        String validatedContentType = validateFileAndInferMimeType(file.getOriginalFilename(), bytes, type);
        String sanitizedName = sanitizeFilename(file.getOriginalFilename());

        fileRepository.save(BusinessFile.builder()
                .business(business)
                .fileType(type)
                .originalName(sanitizedName)
                .contentType(validatedContentType)
                .data(bytes)
                .build());
    }

    public ResponseEntity<byte[]> serveFile(Long fileId) {
        return serveFile(fileId, null);
    }

    public ResponseEntity<byte[]> serveFile(Long fileId, String callerEmail) {
        BusinessFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        Business business = file.getBusiness();
        boolean isPublicImage = file.getFileType() == BusinessFile.FileType.IMAGE
                && business.getStatus() == com.businessexchange.business.entity.BusinessStatus.APPROVED
                && business.getVerificationStatus() == com.businessexchange.seller.entity.VerificationStatus.APPROVED;

        if (!isPublicImage) {
            if (callerEmail == null) {
                throw new AccessDeniedException("Authentication required to access this file");
            }
            User caller = userRepository.findByEmail(callerEmail)
                    .orElseThrow(() -> new AccessDeniedException("Caller not found"));

            boolean isAdmin = caller.getRole() == UserRole.ADMIN;
            boolean isOfficer = caller.getRole() == UserRole.VERIFICATION_OFFICER;
            boolean isOwner = business.getSeller() != null && business.getSeller().getEmail().equals(callerEmail);

            if (!isAdmin && !isOfficer && !isOwner) {
                throw new AccessDeniedException("You do not have permission to access this file");
            }
        }

        String sanitizedFilename = sanitizeFilename(file.getOriginalName());
        String disposition = file.getFileType() == BusinessFile.FileType.IMAGE ? "inline" : "attachment";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition + "; filename=\"" + sanitizedFilename + "\"")
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(file.getContentType() != null ? file.getContentType() : "application/octet-stream"))
                .body(file.getData());
    }

    public List<BusinessFileResponse> getFilesForBusiness(Long businessId) {
        return getFilesForBusiness(businessId, null);
    }

    public List<BusinessFileResponse> getFilesForBusiness(Long businessId, String callerEmail) {
        List<BusinessFile> allFiles = fileRepository.findByBusinessId(businessId);
        if (allFiles.isEmpty()) {
            return List.of();
        }

        Business business = allFiles.get(0).getBusiness();
        boolean isAuthorized = false;

        if (callerEmail != null) {
            User caller = userRepository.findByEmail(callerEmail).orElse(null);
            if (caller != null) {
                isAuthorized = caller.getRole() == UserRole.ADMIN
                        || caller.getRole() == UserRole.VERIFICATION_OFFICER
                        || (business.getSeller() != null && business.getSeller().getEmail().equals(callerEmail));
            }
        }

        // If not authorized (unauthenticated or normal buyer), only show public images
        final boolean authorized = isAuthorized;
        return allFiles.stream()
                .filter(f -> authorized || f.getFileType() == BusinessFile.FileType.IMAGE)
                .map(BusinessFileResponse::from)
                .toList();
    }

    @Transactional
    public void deleteFile(Long businessId, Long fileId, String callerEmail) {
        if (callerEmail == null) {
            throw new AccessDeniedException("Authentication required to delete files");
        }

        BusinessFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        if (!file.getBusiness().getId().equals(businessId)) {
            throw new IllegalArgumentException("File does not belong to the specified business");
        }

        User caller = userRepository.findByEmail(callerEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Caller user not found"));

        boolean isAdmin = caller.getRole() == UserRole.ADMIN;
        boolean isOwner = file.getBusiness().getSeller().getEmail().equals(callerEmail);

        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException("You do not have permission to delete this file");
        }

        fileRepository.delete(file);
    }

    public List<BusinessFileResponse> findAllDocumentsBySellerId(Long sellerId) {
        return fileRepository.findDocumentsBySellerId(sellerId)
                .stream()
                .map(BusinessFileResponse::from)
                .toList();
    }

    private String validateFileAndInferMimeType(String originalFilename, byte[] data, BusinessFile.FileType type) {
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new IllegalArgumentException("Filename cannot be empty");
        }

        String lowerName = originalFilename.toLowerCase();

        if (type == BusinessFile.FileType.IMAGE) {
            if (!lowerName.endsWith(".jpg") && !lowerName.endsWith(".jpeg")
                    && !lowerName.endsWith(".png") && !lowerName.endsWith(".webp")) {
                throw new IllegalArgumentException("Images must have a .jpg, .jpeg, .png, or .webp extension");
            }
            if (isJpeg(data)) {
                return "image/jpeg";
            }
            if (isPng(data)) {
                return "image/png";
            }
            if (isWebp(data)) {
                return "image/webp";
            }
            throw new IllegalArgumentException("File signature does not match a valid JPEG, PNG, or WEBP image");
        } else {
            if (!lowerName.endsWith(".pdf")) {
                throw new IllegalArgumentException("Documents and financial reports must have a .pdf extension");
            }
            if (isPdf(data)) {
                return "application/pdf";
            }
            throw new IllegalArgumentException("File signature does not match a valid PDF document");
        }
    }

    private boolean isJpeg(byte[] data) {
        return data != null && data.length >= 3
                && (data[0] & 0xFF) == 0xFF
                && (data[1] & 0xFF) == 0xD8
                && (data[2] & 0xFF) == 0xFF;
    }

    private boolean isPng(byte[] data) {
        return data != null && data.length >= 8
                && (data[0] & 0xFF) == 0x89
                && data[1] == 0x50 // P
                && data[2] == 0x4E // N
                && data[3] == 0x47 // G
                && data[4] == 0x0D
                && data[5] == 0x0A
                && data[6] == 0x1A
                && data[7] == 0x0A;
    }

    private boolean isWebp(byte[] data) {
        return data != null && data.length >= 12
                && data[0] == 0x52 && data[1] == 0x49 && data[2] == 0x46 && data[3] == 0x52 // RIFF
                && data[8] == 0x57 && data[9] == 0x45 && data[10] == 0x42 && data[11] == 0x50; // WEBP
    }

    private boolean isPdf(byte[] data) {
        return data != null && data.length >= 4
                && data[0] == 0x25 && data[1] == 0x50 && data[2] == 0x44 && data[3] == 0x46; // %PDF
    }

    private String sanitizeFilename(String filename) {
        if (filename == null || filename.isBlank()) {
            return "unnamed_file";
        }
        // Remove path sequences and illegal characters
        String clean = filename.replace("\\", "/");
        int lastSlash = clean.lastIndexOf('/');
        if (lastSlash >= 0) {
            clean = clean.substring(lastSlash + 1);
        }
        clean = clean.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (clean.isBlank()) {
            return "unnamed_file";
        }
        return clean;
    }
}