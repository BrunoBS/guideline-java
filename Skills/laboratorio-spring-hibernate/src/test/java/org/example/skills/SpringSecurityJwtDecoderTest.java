package org.example.skills;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SpringSecurityJwtDecoderTest {
    private static final byte[] KEY = "spring-security-isolated-jwt-secret-key-2026".getBytes(StandardCharsets.UTF_8);
    private static final String ISSUER = "https://issuer.example.test";
    private static final String AUDIENCE = "guideline-api";

    @Test
    void resourceServerDecoderValidatesSignatureIssuerAudienceAndExpiration() throws Exception {
        var decoder = NimbusJwtDecoder.withSecretKey(new SecretKeySpec(KEY, "HmacSHA256"))
            .macAlgorithm(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256)
            .build();
        OAuth2TokenValidator<Jwt> audienceValidator = jwt ->
            jwt.getAudience().contains(AUDIENCE)
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid audience", null));
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(ISSUER), audienceValidator));

        assertEquals("alice", decoder.decode(token(KEY, "alice", ISSUER, AUDIENCE, 300)).getSubject());
        assertThrows(JwtException.class, () -> decoder.decode(token(KEY, "alice", "other", AUDIENCE, 300)));
        assertThrows(JwtException.class, () -> decoder.decode(token(KEY, "alice", ISSUER, "other", 300)));
        assertThrows(JwtException.class, () -> decoder.decode(token(KEY, "alice", ISSUER, AUDIENCE, -60)));
        byte[] wrongKey = "different-spring-security-jwt-secret-2026".getBytes(StandardCharsets.UTF_8);
        assertThrows(JwtException.class, () -> decoder.decode(token(wrongKey, "alice", ISSUER, AUDIENCE, 300)));
    }

    private String token(byte[] key, String subject, String issuer, String audience, long ttlSeconds) throws Exception {
        Instant now = Instant.now();
        var claims = new JWTClaimsSet.Builder().subject(subject).issuer(issuer).audience(List.of(audience))
            .issueTime(Date.from(now)).notBeforeTime(Date.from(now.minusSeconds(10)))
            .expirationTime(Date.from(now.plusSeconds(ttlSeconds))).build();
        var jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
        jwt.sign(new MACSigner(key));
        return jwt.serialize();
    }
}
