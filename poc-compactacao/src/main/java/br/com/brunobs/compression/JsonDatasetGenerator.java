package br.com.brunobs.compression;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;

import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Random;
import java.util.UUID;

/** Streams varied ConfigurationData records using one record as a seed. */
public final class JsonDatasetGenerator {
    private static final long BYTES_PER_MIB = 1024L * 1024L;
    private static final JsonFactory JSON = new JsonFactory();

    public enum Profile { REPETITIVE, REALISTIC }

    private JsonDatasetGenerator() { }

    public static long generate(String templateJson, long targetMiB, Path destination, Profile profile)
            throws IOException {
        if (targetMiB < 1) throw new IllegalArgumentException("O tamanho deve ser de pelo menos 1 MiB.");
        long targetBytes = Math.multiplyExact(targetMiB, BYTES_PER_MIB);
        ConfigurationTemplate template = parseTemplate(templateJson);
        Random random = new Random(0x5EEDC0DEL);
        long written = 0;
        long index = 0;

        try (OutputStream output = new BufferedOutputStream(Files.newOutputStream(destination))) {
            output.write('[');
            written++;
            while (written < targetBytes || index == 0) {
                if (index > 0) {
                    output.write(',');
                    written++;
                }
                byte[] record = serializeRecord(template, index, profile, random);
                output.write(record);
                written += record.length;
                index++;
            }
            output.write(']');
        }
        return Files.size(destination);
    }

    private static ConfigurationTemplate parseTemplate(String json) throws IOException {
        String application = null;
        String key = null;
        String value = null;
        try (JsonParser parser = JSON.createParser(json)) {
            if (parser.nextToken() != JsonToken.START_OBJECT) {
                throw new IllegalArgumentException("O modelo precisa ser um objeto JSON.");
            }
            while (parser.nextToken() == JsonToken.FIELD_NAME) {
                String name = parser.currentName();
                JsonToken token = parser.nextToken();
                if (token != JsonToken.VALUE_STRING) {
                    throw new IllegalArgumentException("Os campos application, key e value precisam ser strings.");
                }
                String fieldValue = parser.getText();
                switch (name) {
                    case "application" -> application = fieldValue;
                    case "key" -> key = fieldValue;
                    case "value" -> value = fieldValue;
                    default -> throw new IllegalArgumentException("Campo não esperado no modelo: " + name);
                }
            }
            if (parser.nextToken() != null) {
                throw new IllegalArgumentException("Informe apenas um objeto JSON como modelo.");
            }
        }
        if (application == null || key == null || value == null) {
            throw new IllegalArgumentException("O modelo deve conter application, key e value.");
        }
        return new ConfigurationTemplate(application, key, value);
    }

    private static byte[] serializeRecord(ConfigurationTemplate template, long index, Profile profile, Random random)
            throws IOException {
        String application = template.application() + "-" + profile.name().toLowerCase(Locale.ROOT)
                + "-app-" + String.format(Locale.ROOT, "%03d", index % applicationCardinality(profile));
        String key = template.key() + ".mock." + keySuffix(index, profile, random);
        String value = mockValue(template.value(), index, profile, random);

        ByteArrayOutputStream bytes = new ByteArrayOutputStream(256);
        try (JsonGenerator generator = JSON.createGenerator(bytes)) {
            generator.writeStartObject();
            generator.writeStringField("application", application);
            generator.writeStringField("key", key);
            generator.writeStringField("value", value);
            generator.writeEndObject();
        }
        return bytes.toByteArray();
    }

    private static long applicationCardinality(Profile profile) {
        return profile == Profile.REPETITIVE ? 4 : 256;
    }

    private static String keySuffix(long index, Profile profile, Random random) {
        if (profile == Profile.REPETITIVE) return String.format(Locale.ROOT, "%04d", index % 128);
        return String.format(Locale.ROOT, "%08d-%08x", index, random.nextInt());
    }

    private static String mockValue(String seed, long index, Profile profile, Random random) throws IOException {
        return switch ((int) (index % 5)) {
            case 0 -> (index % 2 == 0) ? "true" : "false";
            case 1 -> Long.toString(index * 17 + 3);
            case 2 -> seed + "-mock-" + valueToken(index, profile, random);
            case 3 -> jsonValue(index, profile, random, false);
            default -> jsonValue(index, profile, random, true);
        };
    }

    private static String jsonValue(long index, Profile profile, Random random, boolean large) throws IOException {
        StringWriter text = new StringWriter(large ? 8192 : 128);
        try (JsonGenerator generator = JSON.createGenerator(text)) {
            generator.writeStartObject();
            generator.writeNumberField("sequence", index);
            generator.writeStringField("kind", large ? "large-mock" : "small-mock");
            generator.writeBooleanField("enabled", index % 2 == 0);
            if (large) {
                generator.writeArrayFieldStart("settings");
                int count = profile == Profile.REPETITIVE ? 48 : 64;
                for (int setting = 0; setting < count; setting++) {
                    generator.writeStartObject();
                    generator.writeStringField("name", "setting-" + setting);
                    generator.writeStringField("value", valueToken(index + setting, profile, random));
                    generator.writeEndObject();
                }
                generator.writeEndArray();
            } else {
                generator.writeStringField("code", "cfg-" + valueToken(index, profile, random));
            }
            generator.writeEndObject();
        }
        return text.toString();
    }

    private static String valueToken(long index, Profile profile, Random random) {
        if (profile == Profile.REPETITIVE) return String.format(Locale.ROOT, "value-%04d", index % 256);
        return UUID.nameUUIDFromBytes((index + ":" + random.nextLong()).getBytes(StandardCharsets.UTF_8)).toString();
    }

    private record ConfigurationTemplate(String application, String key, String value) { }
}
