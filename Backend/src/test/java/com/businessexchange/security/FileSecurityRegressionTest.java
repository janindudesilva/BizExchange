package com.businessexchange.security;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessFile;
import com.businessexchange.business.entity.BusinessFile.FileType;
import com.businessexchange.business.repository.BusinessFileRepository;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.business.service.BusinessFileService;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import com.businessexchange.auth.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;

import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FileSecurityRegressionTest {

    @Mock
    private BusinessFileRepository fileRepository;

    @Mock
    private BusinessRepository businessRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private BusinessFileService fileService;

    @TempDir
    Path tempDir;

    private Business sampleBusiness;
    private User seller;
    private User otherUser;
    private User admin;

    @BeforeEach
    void setUp() {
        seller = new User();
        seller.setId(10L);
        seller.setEmail("seller@example.com");
        seller.setRole(UserRole.SELLER);

        otherUser = new User();
        otherUser.setId(20L);
        otherUser.setEmail("buyer@example.com");
        otherUser.setRole(UserRole.BUYER);

        admin = new User();
        admin.setId(1L);
        admin.setEmail("admin@example.com");
        admin.setRole(UserRole.ADMIN);

        sampleBusiness = Business.builder()
                .id(100L)
                .title("Sample Store")
                .seller(seller)
                .build();

        lenient().when(userRepository.findByEmail(seller.getEmail())).thenReturn(Optional.of(seller));
    }

    @Test
    @DisplayName("ATTACK: Uploading file with fake JPG extension containing script/text must be rejected")
    void testMagicByteValidation_RejectsFakeExtension() {
        when(businessRepository.findById(100L)).thenReturn(Optional.of(sampleBusiness));

        // Fake JPG containing shell script / HTML text
        byte[] fakeJpgContent = "<script>alert('xss')</script>".getBytes();
        MockMultipartFile fakeJpg = new MockMultipartFile(
                "images", "exploit.jpg", "image/jpeg", fakeJpgContent
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                fileService.uploadFiles(100L, List.of(fakeJpg), null, null, seller.getEmail())
        );

        assertTrue(ex.getMessage().contains("File signature does not match"));
        verify(fileRepository, never()).save(any());
    }

    @Test
    @DisplayName("ATTACK: Uploading file exceeding max files per request must be rejected")
    void testMaxFileCountLimit() {
        when(businessRepository.findById(100L)).thenReturn(Optional.of(sampleBusiness));

        // Create 11 files (limit is 10)
        List<org.springframework.web.multipart.MultipartFile> elevenFiles = java.util.stream.IntStream.range(0, 11)
                .mapToObj(i -> (org.springframework.web.multipart.MultipartFile) new MockMultipartFile(
                        "images", "file" + i + ".jpg", "image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0}
                ))
                .toList();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                fileService.uploadFiles(100L, elevenFiles, null, null, seller.getEmail())
        );

        assertTrue(ex.getMessage().contains("files can be uploaded per request"));
        verify(fileRepository, never()).save(any());
    }

    @Test
    @DisplayName("ATTACK: Non-owner seller cannot upload files to another seller's business")
    void testUploadAuthorization_NonOwnerRejected() {
        when(businessRepository.findById(100L)).thenReturn(Optional.of(sampleBusiness));

        User intruder = new User();
        intruder.setId(99L);
        intruder.setEmail("intruder@example.com");
        intruder.setRole(UserRole.SELLER);
        when(userRepository.findByEmail("intruder@example.com")).thenReturn(Optional.of(intruder));

        byte[] validJpgBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0, 0, 0};
        MockMultipartFile validJpg = new MockMultipartFile("images", "photo.jpg", "image/jpeg", validJpgBytes);

        assertThrows(AccessDeniedException.class, () ->
                fileService.uploadFiles(100L, List.of(validJpg), null, null, "intruder@example.com")
        );
    }

    @Test
    @DisplayName("ATTACK (IDOR): Unauthenticated user cannot download confidential financial reports")
    void testServeFile_UnauthenticatedBlockedFromFinancialReports() {
        BusinessFile confidentialFile = BusinessFile.builder()
                .id(50L)
                .business(sampleBusiness)
                .fileType(FileType.FINANCIAL_REPORT)
                .data(new byte[]{1, 2, 3})
                .originalName("report.pdf")
                .build();

        when(fileRepository.findById(50L)).thenReturn(Optional.of(confidentialFile));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                fileService.serveFile(50L, (String) null)
        );

        assertTrue(ex.getMessage().contains("Authentication required"));
    }

    @Test
    @DisplayName("ATTACK (IDOR): Other buyer/seller cannot download confidential financial reports")
    void testServeFile_UnauthorizedUserBlockedFromFinancialReports() {
        BusinessFile confidentialFile = BusinessFile.builder()
                .id(50L)
                .business(sampleBusiness)
                .fileType(FileType.FINANCIAL_REPORT)
                .data(new byte[]{1, 2, 3})
                .originalName("report.pdf")
                .build();

        when(fileRepository.findById(50L)).thenReturn(Optional.of(confidentialFile));
        when(userRepository.findByEmail(otherUser.getEmail())).thenReturn(Optional.of(otherUser));

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                fileService.serveFile(50L, otherUser.getEmail())
        );

        assertTrue(ex.getMessage().contains("You do not have permission"));
    }

    @Test
    @DisplayName("AUTHORIZATION: Owner of the business can access their confidential reports")
    void testServeFile_OwnerAllowedToAccess() {
        BusinessFile confidentialFile = BusinessFile.builder()
                .id(50L)
                .business(sampleBusiness)
                .fileType(FileType.FINANCIAL_REPORT)
                .data(new byte[]{0x25, 0x50, 0x44, 0x46})
                .originalName("report.pdf")
                .contentType("application/pdf")
                .build();

        when(fileRepository.findById(50L)).thenReturn(Optional.of(confidentialFile));
        when(userRepository.findByEmail(seller.getEmail())).thenReturn(Optional.of(seller));

        var response = fileService.serveFile(50L, seller.getEmail());
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
    }

    @Test
    @DisplayName("AUTHORIZATION: Administrator can access confidential reports for auditing")
    void testServeFile_AdminAllowedToAccess() {
        BusinessFile confidentialFile = BusinessFile.builder()
                .id(50L)
                .business(sampleBusiness)
                .fileType(FileType.FINANCIAL_REPORT)
                .data(new byte[]{0x25, 0x50, 0x44, 0x46})
                .originalName("admin_audit.pdf")
                .contentType("application/pdf")
                .build();

        when(fileRepository.findById(50L)).thenReturn(Optional.of(confidentialFile));
        when(userRepository.findByEmail(admin.getEmail())).thenReturn(Optional.of(admin));

        var response = fileService.serveFile(50L, admin.getEmail());
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
    }
}
