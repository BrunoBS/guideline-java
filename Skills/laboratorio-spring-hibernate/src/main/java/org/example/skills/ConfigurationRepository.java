package org.example.skills;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface ConfigurationRepository extends JpaRepository<ConfigurationEntity, Long> {
    Optional<ConfigurationEntity> findByIdAndWorkspaceId(Long id, Long workspaceId);
    Page<ConfigurationEntity> findByWorkspaceId(Long workspaceId, Pageable pageable);
}
