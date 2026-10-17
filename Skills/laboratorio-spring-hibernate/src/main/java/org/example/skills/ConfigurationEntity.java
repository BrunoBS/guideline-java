package org.example.skills;

import jakarta.persistence.*;

@Entity
@Table(name = "skill_configurations", indexes = @Index(name = "idx_skill_workspace_id", columnList = "workspace_id,id"))
public class ConfigurationEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;
    @Column(nullable = false)
    private String name;

    protected ConfigurationEntity() {}

    public ConfigurationEntity(Long workspaceId, String name) {
        this.workspaceId = workspaceId;
        this.name = name;
    }

    public Long getId() { return id; }
    public Long getWorkspaceId() { return workspaceId; }
    public String getName() { return name; }
}
