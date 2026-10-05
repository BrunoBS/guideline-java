package br.com.brunobs.compression;

import com.fasterxml.jackson.core.JsonFactory;
import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.github.luben.zstd.ZstdDictTrainer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

public final class JsonDictionaryTrainer {
    private static final JsonFactory JSON = new JsonFactory();
    private static final int MINIMUM_SAMPLE_COUNT = 11;

    private JsonDictionaryTrainer() { }

    public static TrainingResult train(Path samplesJson, Path dictionaryFile,
                                       int sampleCapacityBytes, int dictionarySizeBytes)
            throws IOException {
        if (sampleCapacityBytes < 1) throw new IllegalArgumentException("A capacidade de amostras deve ser positiva.");
        if (dictionarySizeBytes < 256) throw new IllegalArgumentException("O dicionário deve ter pelo menos 256 bytes.");

        ZstdDictTrainer trainer = new ZstdDictTrainer(sampleCapacityBytes, dictionarySizeBytes);
        long acceptedSampleBytes = 0;
        int sampleCount = 0;
        try (JsonParser parser = JSON.createParser(Files.newInputStream(samplesJson))) {
            if (parser.nextToken() != JsonToken.START_ARRAY) {
                throw new IOException("O arquivo de treinamento precisa conter um array JSON de registros.");
            }
            while (true) {
                JsonToken token = parser.nextToken();
                if (token == JsonToken.END_ARRAY) break;
                if (token == null) throw new IOException("Array JSON de treinamento incompleto.");
                if (token != JsonToken.START_OBJECT) {
                    throw new IOException("Cada amostra de treinamento precisa ser um objeto JSON.");
                }

                ByteArrayOutputStream sampleBytes = new ByteArrayOutputStream(1024);
                try (JsonGenerator generator = JSON.createGenerator(sampleBytes)) {
                    generator.copyCurrentStructure(parser);
                }
                byte[] sample = sampleBytes.toByteArray();
                if (!trainer.addSample(sample)) break;
                acceptedSampleBytes += sample.length;
                sampleCount++;
            }
        }
        if (sampleCount < MINIMUM_SAMPLE_COUNT) {
            throw new IOException("O treinamento exige pelo menos 11 registros JSON dentro da capacidade informada.");
        }

        byte[] dictionary = trainer.trainSamples();
        Files.write(dictionaryFile, dictionary);
        return new TrainingResult(sampleCount, acceptedSampleBytes, dictionary.length);
    }

    public record TrainingResult(int sampleCount, long sampleBytes, int dictionaryBytes) { }
}
