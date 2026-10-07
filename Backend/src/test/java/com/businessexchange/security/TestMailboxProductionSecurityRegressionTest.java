package com.businessexchange.security;

import com.businessexchange.common.test.TestMailbox;
import com.businessexchange.common.test.TestMailboxController;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("prod")
@TestPropertySource(properties = {
        "app.test-mailbox.enabled=false",
        "jwt.secret=PRODUCTION_REGRESSION_TEST_SECRET_AT_LEAST_32_BYTES_LONG"
})
public class TestMailboxProductionSecurityRegressionTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Production: TestMailbox and TestMailboxController beans must not exist in application context")
    void testMailboxBeansMustNotExistInProduction() {
        assertFalse(applicationContext.containsBean("testMailbox"),
                "testMailbox bean must not be registered in production configuration");
        assertFalse(applicationContext.containsBean("testMailboxController"),
                "testMailboxController bean must not be registered in production configuration");

        assertNull(applicationContext.getBeanProvider(TestMailbox.class).getIfAvailable(),
                "TestMailbox provider must yield null in production");
        assertNull(applicationContext.getBeanProvider(TestMailboxController.class).getIfAvailable(),
                "TestMailboxController provider must yield null in production");
    }

    @Test
    @DisplayName("Production: Anonymous request to /api/test/mailbox/** must be denied (401 or 404, never 200)")
    void anonymousRequestToTestMailboxMustBeDenied() throws Exception {
        mockMvc.perform(get("/api/test/mailbox/latest-verification")
                        .param("email", "seller@example.com"))
                .andExpect(result -> {
                    int status = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(
                            status == 401 || status == 403 || status == 404,
                            "Expected 401, 403, or 404 in production, but got: " + status
                    );
                });
    }

    @Test
    @DisplayName("Production: Authenticated admin request to /api/test/mailbox/** must return 404 Not Found")
    @WithMockUser(username = "admin@bizexchange.local", roles = {"ADMIN"})
    void authenticatedRequestToTestMailboxReturns404NotFound() throws Exception {
        mockMvc.perform(get("/api/test/mailbox/latest-verification")
                        .param("email", "seller@example.com"))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/test/mailbox/latest-otp")
                        .param("email", "seller@example.com"))
                .andExpect(status().isNotFound());
    }
}
