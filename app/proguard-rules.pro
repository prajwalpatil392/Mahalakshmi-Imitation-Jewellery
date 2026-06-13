# Keep Javascript interface methods and the classes that contain them
-keepattributes *Annotation*,JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep the specific nested CameraInterface class in MainActivity
-keep class com.mahalakshmi.rentals.MainActivity$CameraInterface {
    *;
}
