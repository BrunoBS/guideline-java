package com.pacote.infra.external.clienteexterno;

import org.springframework.stereotype.Service;

@Service
public class ClienteApiService {
    public String call() {
        return "ok";
    }
}
