package org.example.skills;

import jakarta.persistence.*;

@Entity
@Table(name = "skill_configuration_details")
public class ConfigurationDetailEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private String description;

    protected ConfigurationDetailEntity() {}
    public ConfigurationDetailEntity(String description) { this.description = description; }
    public Long getId() { return id; }
    public String getDescription() { return description; }
}
