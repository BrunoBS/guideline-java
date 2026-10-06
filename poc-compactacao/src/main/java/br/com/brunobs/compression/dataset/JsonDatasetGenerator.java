package br.com.brunobs.compression.dataset;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;

import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Random;
import java.util.UUID;

/** Streams records based on any valid JSON value, preserving its structure and field names. */
public final class JsonDatasetGenerator {
    private static final long BYTES_PER_MIB = 1024L * 1024L;
    private static final long DEFAULT_RANDOM_SEED = 0x5EEDC0DEL;
    private static final JsonFactory JSON = new JsonFactory();

    public enum Profile { REPETITIVE, REALISTIC }

    private JsonDatasetGenerator() { }

    public static long generate(String templateJson, long targetMiB, Path destination, Profile profile)
            throws IOException {
        return generate(templateJson, targetMiB, destination, profile, DEFAULT_RANDOM_SEED);
    }

    public static long generate(String templateJson, long targetMiB, Path destination, Profile profile, long seed)
            throws IOException {
        if (targetMiB < 1) throw new IllegalArgumentException("O tamanho deve ser de pelo menos 1 MiB.");
        long targetBytes = Math.multiplyExact(targetMiB, BYTES_PER_MIB);
        JsonTemplate template = parseTemplate(templateJson);
        Random random = new Random(seed);
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

    private static JsonTemplate parseTemplate(String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        try (JsonParser parser = JSON.createParser(bytes)) {
            JsonToken root = parser.nextToken();
            if (root == null) {
                throw new IllegalArgumentException("O modelo não pode estar vazio; informe um JSON válido.");
            }
            parser.skipChildren();
            if (parser.nextToken() != null) {
                throw new IllegalArgumentException("Informe apenas um valor JSON como modelo.");
            }
        }
        return new JsonTemplate(bytes);
    }

    private static byte[] serializeRecord(JsonTemplate template, long index, Profile profile, Random random)
            throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(256);
        try (JsonParser parser = JSON.createParser(template.json());
             JsonGenerator generator = JSON.createGenerator(bytes)) {
            JsonToken root = parser.nextToken();
            writeValue(parser, generator, root, index, profile, random);
        }
        return bytes.toByteArray();
    }

    private static void writeValue(JsonParser parser, JsonGenerator generator, JsonToken token,
                                   long index, Profile profile, Random random) throws IOException {
        if (token == null) throw new IOException("O modelo JSON terminou antes do esperado.");

        switch (token) {
            case START_OBJECT -> {
                generator.writeStartObject();
                JsonToken next;
                while ((next = parser.nextToken()) != JsonToken.END_OBJECT) {
                    if (next != JsonToken.FIELD_NAME) {
                        throw new IOException("Esperado o nome de um campo no objeto do modelo JSON.");
                    }
                    generator.writeFieldName(parser.currentName());
                    writeValue(parser, generator, parser.nextToken(), index, profile, random);
                }
                generator.writeEndObject();
            }
            case START_ARRAY -> {
                generator.writeStartArray();
                JsonToken next;
                while ((next = parser.nextToken()) != JsonToken.END_ARRAY) {
                    writeValue(parser, generator, next, index, profile, random);
                }
                generator.writeEndArray();
            }
            case VALUE_STRING -> generator.writeString(mockString(parser.getText(), index, profile, random));
            case VALUE_NUMBER_INT, VALUE_NUMBER_FLOAT -> {
                BigDecimal value = parser.getDecimalValue();
                generator.writeNumber(value.add(BigDecimal.valueOf(mockNumberDelta(index, profile, random))));
            }
            case VALUE_TRUE, VALUE_FALSE ->
                    generator.writeBoolean(profile == Profile.REPETITIVE ? index % 2 == 0 : random.nextBoolean());
            case VALUE_NULL -> generator.writeNull();
            default -> throw new IOException("Tipo de valor não suportado no modelo JSON: " + token);
        }
    }

    private static String mockString(String value, long index, Profile profile, Random random) {
        String suffix = profile == Profile.REPETITIVE
                ? String.format(Locale.ROOT, "%04d", index % 256)
                : UUID.nameUUIDFromBytes((index + ":" + random.nextLong())
                        .getBytes(StandardCharsets.UTF_8)).toString();
        return value + "-mock-" + suffix;
    }

    private static long mockNumberDelta(long index, Profile profile, Random random) {
        return profile == Profile.REPETITIVE ? index % 16 : random.nextInt(1_000_000);
    }

    private record JsonTemplate(byte[] json) { }
}
