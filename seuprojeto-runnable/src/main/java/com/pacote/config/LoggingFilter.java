package com.pacote.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
public class LoggingFilter extends OncePerRequestFilter {

    public static final String CORRELATION_ID = "correlationId";
    public static final String USERNAME = "username";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            // Captura ou gera o correlation-id
            String correlationId = request.getHeader(CORRELATION_ID);
            if (correlationId == null || correlationId.isBlank()) {
                correlationId = UUID.randomUUID().toString();
            }
            MDC.put(CORRELATION_ID, correlationId);

            String username = "anonymous";
            MDC.put(USERNAME, username);

            // Adiciona o correlation-id no header da resposta
            response.setHeader(CORRELATION_ID, correlationId);

            filterChain.doFilter(request, response);
        } finally {
            // Limpa MDC para não vazar para outras requisições
            MDC.remove(CORRELATION_ID);
            MDC.remove(USERNAME);
        }
    }
}
