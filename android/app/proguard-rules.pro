# VozArt App - ProGuard Rules

# Keep Capacitor
-keep class com.getcapacitor.** { *; }
-keep class com.google.android.material.** { *; }

# Keep VozArt app entry points
-keep class com.vozartdev.app.** { *; }

# Keep AndroidX
-keep class androidx.core.app.** { *; }
-keep class androidx.appcompat.** { *; }

# Keep WebView JS bridge (used by Capacitor bridge)
-keepclassmembers class * extends android.webkit.WebView {
   public *;
}
-keepclassmembers class * extends android.webkit.WebViewClient {
   public *;
}

# Keep FileProvider
-keep class androidx.core.content.FileProvider { *; }

# Keep all JavascriptInterface methods accessible from WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Prevent obfuscation of serialization
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    !static !transient <fields>;
}

# Keep Gson/JSON serialization classes
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
