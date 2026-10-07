package com.businessexchange.verification;

import com.businessexchange.business.entity.Business;
import com.businessexchange.business.entity.BusinessCategory;
import com.businessexchange.business.entity.BusinessFile;
import com.businessexchange.business.entity.BusinessStatus;
import com.businessexchange.business.repository.BusinessCategoryRepository;
import com.businessexchange.business.repository.BusinessFileRepository;
import com.businessexchange.business.repository.BusinessRepository;
import com.businessexchange.seller.entity.VerificationStatus;
import com.businessexchange.user.entity.User;
import com.businessexchange.user.entity.UserRole;
import com.businessexchange.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class VerificationDocumentControllerAccessIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BusinessRepository businessRepository;

    @Autowired
    private BusinessCategoryRepository categoryRepository;

    @Autowired
    private BusinessFileRepository fileRepository;

    private User ownerSeller;
    private User otherSeller;
    private User buyer;
    private User officer;
    private User admin;
    private Business business;
    private BusinessFile privateDocFile;
    private BusinessFile imageFile;

    @BeforeEach
    void setUp() {
        fileRepository.deleteAll();
        businessRepository.deleteAll();
        categoryRepository.deleteAll();
        userRepository.deleteAll();

        ownerSeller = userRepository.save(User.builder()
                .email("seller_owner@test.com")
                .fullName("Owner Seller")
                .passwordHash("hash")
                .role(UserRole.SELLER)
                .status(com.businessexchange.user.entity.AccountStatus.ACTIVE)
                .tokenVersion(1)
                .build());

        otherSeller = userRepository.save(User.builder()
                .email("seller_other@test.com")
                .fullName("Other Seller")
                .passwordHash("hash")
                .role(UserRole.SELLER)
                .status(com.businessexchange.user.entity.AccountStatus.ACTIVE)
                .tokenVersion(1)
                .build());

        buyer = userRepository.save(User.builder()
                .email("buyer@test.com")
                .fullName("Buyer User")
                .passwordHash("hash")
                .role(UserRole.BUYER)
                .status(com.businessexchange.user.entity.AccountStatus.ACTIVE)
                .tokenVersion(1)
                .build());

        officer = userRepository.save(User.builder()
                .email("officer@test.com")
                .fullName("Verification Officer")
                .passwordHash("hash")
                .role(UserRole.VERIFICATION_OFFICER)
                .status(com.businessexchange.user.entity.AccountStatus.ACTIVE)
                .tokenVersion(1)
                .build());

        admin = userRepository.save(User.builder()
                .email("admin_user@test.com")
                .fullName("Platform Admin")
                .passwordHash("hash")
                .role(UserRole.ADMIN)
                .status(com.businessexchange.user.entity.AccountStatus.ACTIVE)
                .tokenVersion(1)
                .build());

        BusinessCategory category = categoryRepository.save(BusinessCategory.builder()
                .name("Retail")
                .build());

        business = businessRepository.save(Business.builder()
                .title("Sunshine Grocery")
                .description("A profitable retail grocery")
                .category(category)
                .seller(ownerSeller)
                .location("Galle")
                .askingPrice(BigDecimal.valueOf(100000))
                .status(BusinessStatus.APPROVED)
                .verificationStatus(VerificationStatus.APPROVED)
                .build());

        // Save one private document (PDF) and one image
        privateDocFile = fileRepository.save(BusinessFile.builder()
                .business(business)
                .fileType(BusinessFile.FileType.DOCUMENT)
                .originalName("deed.pdf")
                .contentType("application/pdf")
                .data("%PDF-1.4 test deed data".getBytes())
                .build());

        imageFile = fileRepository.save(BusinessFile.builder()
                .business(business)
                .fileType(BusinessFile.FileType.IMAGE)
                .originalName("store.jpg")
                .contentType("image/jpeg")
                .data(new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00})
                .build());
    }

    @Test
    @DisplayName("Owner access: can view all documents and download private file")
    @WithMockUser(username = "seller_owner@test.com", roles = {"SELLER"})
    void testOwnerAccess() throws Exception {
        mockMvc.perform(get("/api/verification/" + business.getId() + "/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));

        mockMvc.perform(get("/api/verification/files/" + privateDocFile.getId()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Officer access: can view all documents and download private file")
    @WithMockUser(username = "officer@test.com", roles = {"VERIFICATION_OFFICER"})
    void testOfficerAccess() throws Exception {
        mockMvc.perform(get("/api/verification/" + business.getId() + "/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));

        mockMvc.perform(get("/api/verification/files/" + privateDocFile.getId()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Admin access: can view all documents and download private file")
    @WithMockUser(username = "admin_user@test.com", roles = {"ADMIN"})
    void testAdminAccess() throws Exception {
        mockMvc.perform(get("/api/verification/" + business.getId() + "/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)));

        mockMvc.perform(get("/api/verification/files/" + privateDocFile.getId()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Unauthorized seller access: gets only public files; private file download is 403 Forbidden")
    @WithMockUser(username = "seller_other@test.com", roles = {"SELLER"})
    void testUnauthorizedSellerAccess() throws Exception {
        // Document list filters out private document
        mockMvc.perform(get("/api/verification/" + business.getId() + "/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].originalName").value("store.jpg"));

        // Direct private file download rejected with 403 Forbidden
        mockMvc.perform(get("/api/verification/files/" + privateDocFile.getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Buyer access: gets only public files; private file download is 403 Forbidden")
    @WithMockUser(username = "buyer@test.com", roles = {"BUYER"})
    void testBuyerAccess() throws Exception {
        mockMvc.perform(get("/api/verification/" + business.getId() + "/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].originalName").value("store.jpg"));

        mockMvc.perform(get("/api/verification/files/" + privateDocFile.getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Anonymous access: gets only public files; private file download is 403 Forbidden")
    void testAnonymousAccess() throws Exception {
        mockMvc.perform(get("/api/verification/" + business.getId() + "/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].originalName").value("store.jpg"));

        mockMvc.perform(get("/api/verification/files/" + privateDocFile.getId()))
                .andExpect(status().isForbidden());
    }
}
