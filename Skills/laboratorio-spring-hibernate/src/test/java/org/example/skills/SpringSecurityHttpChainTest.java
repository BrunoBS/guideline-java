package org.example.skills;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.web.servlet.DispatcherServlet;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SpringSecurityHttpChainTest {
    private static final byte[] KEY = "spring-security-http-chain-test-secret-2026".getBytes(StandardCharsets.UTF_8);

    @Test
    void checksJwtInRealSecurityFilterChainBeforeDispatchingController() throws Exception {
        try (var context = new AnnotationConfigWebApplicationContext()) {
            context.register(TestConfig.class);
            context.setServletContext(new org.springframework.mock.web.MockServletContext());
            context.refresh();
            var proxy = context.getBean("springSecurityFilterChain", jakarta.servlet.Filter.class);
            var dispatcher = new DispatcherServlet(context);
            dispatcher.init(new org.springframework.mock.web.MockServletConfig(context.getServletContext()));

            assertEquals(401, invoke(proxy, dispatcher, null, "10", "101"));
            assertEquals(401, invoke(proxy, dispatcher, token("alice", "wrong-issuer", "guideline-api", 300), "10", "101"));
            assertEquals(401, invoke(proxy, dispatcher, token("alice", "https://issuer.example.test", "wrong-audience", 300), "10", "101"));
            assertEquals(401, invoke(proxy, dispatcher, token("alice", "https://issuer.example.test", "guideline-api", -60), "10", "101"));
            String alice = token("alice", "https://issuer.example.test", "guideline-api", 300);
            assertEquals(200, invoke(proxy, dispatcher, alice, "10", "101"));
            assertEquals(403, invoke(proxy, dispatcher, alice, "20", "202"));
            assertEquals(404, invoke(proxy, dispatcher, alice, "10", "202"));
            assertEquals(404, invoke(proxy, dispatcher, alice, "10", "999"));
        }
    }

    private int invoke(jakarta.servlet.Filter security, DispatcherServlet dispatcher,
                       String jwt, String workspace, String resource) throws Exception {
        var request = new MockHttpServletRequest("GET", "/resources/" + resource);
        request.setServletPath("/resources/" + resource);
        request.addHeader("X-Workspace-Id", workspace);
        if (jwt != null) request.addHeader("Authorization", "Bearer " + jwt);
        var response = new MockHttpServletResponse();
        security.doFilter(request, response, new MockFilterChain(dispatcher));
        return response.getStatus();
    }

    private String token(String subject, String issuer, String audience, long ttlSeconds) throws Exception {
        Instant now = Instant.now();
        var claims = new JWTClaimsSet.Builder().subject(subject).issuer(issuer).audience(List.of(audience))
            .issueTime(Date.from(now)).notBeforeTime(Date.from(now.minusSeconds(10)))
            .expirationTime(Date.from(now.plusSeconds(ttlSeconds))).build();
        var jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(KEY));
        return jwt.serialize();
    }

    @Configuration
    @EnableWebSecurity
    static class TestConfig {
        @Bean
        SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
            return http.csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                .oauth2ResourceServer(oauth -> oauth.jwt(jwt -> {}))
                .build();
        }

        @Bean
        org.springframework.security.oauth2.jwt.JwtDecoder jwtDecoder() {
            var decoder = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(KEY, "HmacSHA256"))
                .macAlgorithm(MacAlgorithm.HS256).build();
            OAuth2TokenValidator<Jwt> audience = jwt -> jwt.getAudience().contains("guideline-api")
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "audience", null));
            decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer("https://issuer.example.test"), audience));
            return decoder;
        }

        @Bean
        ResourceController resourceController() { return new ResourceController(); }
    }

    @RestController
    static class ResourceController {
        @GetMapping("/resources/{id}")
        String resource(@RequestHeader("X-Workspace-Id") long workspace,
                        @org.springframework.web.bind.annotation.PathVariable long id) {
            Jwt principal = (Jwt) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            if (!("alice".equals(principal.getSubject()) && workspace == 10L))
                throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            if (id != 101L) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            return "allowed";
        }
    }
}
