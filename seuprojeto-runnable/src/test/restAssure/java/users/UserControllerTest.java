package users;

import config.BaseIntegrationTest;
import config.TestDataFactory;
import dto.UserRequest;
import dto.UserResponse;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import support.UserClient;

import static io.restassured.RestAssured.given;
import static org.assertj.core.api.Assertions.assertThat;

class UserControllerTest extends BaseIntegrationTest {

    @Nested
    class CreateUser {

        @Test
        void shouldCreateUserSuccessfully() {

            UserRequest request = TestDataFactory.validUser();

            UserResponse response = UserClient.create(request);

            assertThat(response.id).isNotNull();
            assertThat(response.name).isEqualTo(request.name);
            assertThat(response.email).isEqualTo(request.email);
            assertThat(response.active).isTrue();
        }

        @Test
        void shouldFailWhenEmailIsMissing() {

            UserRequest request = TestDataFactory.invalidUserWithoutEmail();

            given()
                    .contentType("application/json")
                    .body(request)
                    .when()
                    .post("/users")
                    .then()
                    .statusCode(400);
        }
    }

    @Nested
    class FullCrudFlow {

        @Test
        void shouldExecuteFullCrud() {

            // CREATE
            UserRequest createRequest = TestDataFactory.validUser();
            UserResponse created = UserClient.create(createRequest);

            // GET
            UserResponse fetched = UserClient.get(created.id);
            assertThat(fetched.email).isEqualTo(createRequest.email);

            // UPDATE
            createRequest.name = "Updated Name";
            UserClient.update(created.id, createRequest);

            UserResponse updated = UserClient.get(created.id);
            assertThat(updated.name).isEqualTo("Updated Name");

            // DELETE
            UserClient.delete(created.id);

            given()
                    .when()
                    .get("/users/{id}", created.id)
                    .then()
                    .statusCode(404);
        }
    }
}