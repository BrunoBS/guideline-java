package config;

import dto.UserRequest;

import java.util.UUID;

public class TestDataFactory {

    public static UserRequest validUser() {
        UserRequest user = new UserRequest();
        user.name = "User " + UUID.randomUUID();
        user.email = "user-" + UUID.randomUUID() + "@test.com";
        user.active = true;
        return user;
    }

    public static UserRequest invalidUserWithoutEmail() {
        UserRequest user = new UserRequest();
        user.name = "Invalid User";
        user.active = true;
        return user;
    }
}
