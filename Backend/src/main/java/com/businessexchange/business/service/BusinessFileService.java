package com.businessexchange.business.service;

import com.businessexchange.business.dto.BusinessFileResponse;
import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessFile;
import com.businessexchange.business.repository.BusinessFileRepository;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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

    @Transactional
    public List<BusinessFileResponse> uploadFiles(
            Long businessId,
            List<MultipartFile> images,
            List<MultipartFile> documents,
            List<MultipartFile> financialReports
    ) throws IOException {
        Business business = businessRepository.findById(businessId)
                .orElseThrow(() -> new ResourceNotFoundException("Business not found"));

        if (images != null) {
            for (MultipartFile file : images) saveFile(business, file, BusinessFile.FileType.IMAGE);
        }
        if (documents != null) {
            for (MultipartFile file : documents) saveFile(business, file, BusinessFile.FileType.DOCUMENT);
        }
        if (financialReports != null) {
            for (MultipartFile file : financialReports) saveFile(business, file, BusinessFile.FileType.FINANCIAL_REPORT);
        }

        return fileRepository.findByBusinessId(businessId)
                .stream()
                .map(BusinessFileResponse::from)
                .toList();
    }

    private void saveFile(Business business, MultipartFile file, BusinessFile.FileType type) throws IOException {
        fileRepository.save(BusinessFile.builder()
                .business(business)
                .fileType(type)
                .originalName(file.getOriginalFilename())
                .contentType(file.getContentType())
                .data(file.getBytes())
                .build());
    }

    public ResponseEntity<byte[]> serveFile(Long fileId) {
        BusinessFile file = fileRepository.findById(fileId)
                .orElseThrow(() -> new ResourceNotFoundException("File not found"));

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + file.getOriginalName() + "\"")
                .contentType(MediaType.parseMediaType(
                        file.getContentType() != null ? file.getContentType() : "application/octet-stream"))
                .body(file.getData());
    }

    public List<BusinessFileResponse> getFilesForBusiness(Long businessId) {
        return fileRepository.findByBusinessId(businessId)
                .stream()
                .map(BusinessFileResponse::from)
                .toList();
    }
}