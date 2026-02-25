package config;

import io.restassured.RestAssured;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.testcontainers.containers.MySQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import javax.sql.DataSource;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;

@Testcontainers
public abstract class BaseIntegrationTest {

    @Container
    static MySQLContainer<?> mysql =
            new MySQLContainer<>("mysql:8.0")
                    .withDatabaseName("testdb")
                    .withUsername("test")
                    .withPassword("test");

    @Autowired
    protected DataSource dataSource;
    @BeforeEach
    void setup() throws Exception {


        RestAssured.baseURI = "http://localhost";
        RestAssured.port = 8080;


        resetDatabase();
    }

    private void resetDatabase() throws Exception {
        String sql = new String(
                Files.readAllBytes(
                        Paths.get(
                                getClass()
                                        .getClassLoader()
                                        .getResource("sql/cleanup.sql")
                                        .toURI()
                        )
                )
        );

        try (Connection conn = dataSource.getConnection();
             Statement stmt = conn.createStatement()) {

            // Executa múltiplos comandos SQL
            for (String s : sql.split(";")) {
                if (!s.trim().isEmpty()) {
                    stmt.execute(s);
                }
            }
        }

    }
}
