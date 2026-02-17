package com.pacote.core.repository;

import com.pacote.core.model.Usuario;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
public class UsuarioRepository {
    private final Map<Long, Usuario> db = new HashMap<>();
    private long seq = 1L;

    public Usuario save(Usuario u) {
        u.id = seq++;
        db.put(u.id, u);
        return u;
    }

    public List<Usuario> findAll() {
        return new ArrayList<>(db.values());
    }
}
