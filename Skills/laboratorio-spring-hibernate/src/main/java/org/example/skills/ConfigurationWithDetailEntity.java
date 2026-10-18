package org.example.skills;

import jakarta.persistence.*;

@Entity
@Table(name = "skill_configuration_with_details")
public class ConfigurationWithDetailEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "workspace_id", nullable = false)
    private Long workspaceId;
    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.PERSIST, optional = false)
    @JoinColumn(name = "detail_id", nullable = false)
    private ConfigurationDetailEntity detail;

    protected ConfigurationWithDetailEntity() {}
    public ConfigurationWithDetailEntity(Long workspaceId, ConfigurationDetailEntity detail) {
        this.workspaceId = workspaceId;
        this.detail = detail;
    }
    public Long getId() { return id; }
    public Long getWorkspaceId() { return workspaceId; }
    public ConfigurationDetailEntity getDetail() { return detail; }
}
