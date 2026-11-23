using System.Globalization;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;

public static partial class StringSanitizer
{
    public static string Sanitize(string? input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        // 1. Decodifica URL Encoding
        var value = WebUtility.UrlDecode(input);

        // 2. Decodifica HTML Entities
        value = WebUtility.HtmlDecode(value);

        // 3. Decodifica Unicode Escapes
        value = UnicodeEscapeRegex().Replace(
            value,
            match => ((char)Convert.ToInt32(
                match.Groups[1].Value, 16
            )).ToString()
        );

        // 4. Normaliza Unicode, incluindo caracteres
        // de compatibilidade e acentos
        value = value.Normalize(NormalizationForm.FormKD);

        // 5. Remove marcas combinantes e filtra
        // todos os caracteres não permitidos
        var result = new StringBuilder(value.Length);

        foreach (var character in value)
        {
            var category =
                CharUnicodeInfo.GetUnicodeCategory(character);

            if (category is UnicodeCategory.NonSpacingMark
                or UnicodeCategory.SpacingCombiningMark
                or UnicodeCategory.EnclosingMark)
                continue;

            var lower = char.ToLowerInvariant(character);

            if (lower is >= 'a' and <= 'z'
                or >= '0' and <= '9'
                or '.')
            {
                result.Append(lower);
            }
        }

        return result.ToString();
    }

    [GeneratedRegex(@"\\u([0-9a-fA-F]{4})")]
    private static partial Regex UnicodeEscapeRegex();
}


public static bool AreEquivalent(
    string? first,
    string? second)
{
    return string.Equals(
        StringSanitizer.Sanitize(first),
        StringSanitizer.Sanitize(second),
        StringComparison.Ordinal
    );
}
