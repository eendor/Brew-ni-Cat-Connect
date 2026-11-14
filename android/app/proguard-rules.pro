# The app uses only AndroidX, Compose, OkHttp and the platform's org.json, which
# ship their own R8 rules; nothing is looked up by reflection.
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**
