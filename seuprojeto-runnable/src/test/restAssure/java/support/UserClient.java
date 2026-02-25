package support;

import dto.UserRequest;
import dto.UserResponse;

import static io.restassured.RestAssured.given;

public class UserClient {

    public static UserResponse create(UserRequest request) {
        return given()
                .contentType("application/json")
                .body(request)
                .when()
                .post("/users")
                .then()
                .statusCode(201)
                .extract()
                .as(UserResponse.class);
    }

    public static UserResponse get(String id) {
        return given()
                .when()
                .get("/users/{id}", id)
                .then()
                .statusCode(200)
                .extract()
                .as(UserResponse.class);
    }

    public static void update(String id, UserRequest request) {
        given()
                .contentType("application/json")
                .body(request)
                .when()
                .put("/users/{id}", id)
                .then()
                .statusCode(200);
    }

    public static void delete(String id) {
        given()
                .when()
                .delete("/users/{id}", id)
                .then()
                .statusCode(204);
    }
}