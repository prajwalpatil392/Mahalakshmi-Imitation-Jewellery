package com.mahalakshmi.rentals;
import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebChromeClient.FileChooserParams;
import android.webkit.ValueCallback;
import android.webkit.JavascriptInterface;
import android.content.Intent;
import android.content.ClipData;
import android.net.Uri;
import android.webkit.PermissionRequest;
import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.Settings;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private String currentPhotoPath;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1;
    private static final int CAMERA_REQUEST_CODE = 2;
    private static final int PERMISSION_REQUEST_CODE = 100;
    private int burstRemaining = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webView);
        
        // Request permissions
        requestPermissions();

        // Configure WebView
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        
        // ✅ FIX CORS: Allow universal access from file URLs
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        
        // Mixed content: HTTPS only — all backend endpoints (Google Apps Script, Cloudinary) are HTTPS
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }

        // Enable WebView debugging ONLY in debug builds
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            if (0 != (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)) {
                WebView.setWebContentsDebuggingEnabled(true);
            }
        }

        // Add JavaScript interface for native camera
        webView.addJavascriptInterface(new CameraInterface(), "AndroidCamera");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleExternalUrl(request != null ? request.getUrl() : null);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleExternalUrl(url != null ? Uri.parse(url) : null);
            }
        });
        
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> request.grant(request.getResources()));
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                            FileChooserParams fileChooserParams) {
                if (MainActivity.this.filePathCallback != null) {
                    MainActivity.this.filePathCallback.onReceiveValue(null);
                }
                MainActivity.this.filePathCallback = filePathCallback;

                Intent intent = fileChooserParams.createIntent();
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
                } catch (Exception e) {
                    MainActivity.this.filePathCallback = null;
                    return false;
                }
                return true;
            }
        });

        // Load the app
        webView.loadUrl("file:///android_asset/app.html");
    }

    // JavaScript Interface for native camera access
    private class CameraInterface {
        @JavascriptInterface
        public void launchCamera() {
            runOnUiThread(() -> openNativeCamera());
        }

        @JavascriptInterface
        public void launchCameraBurst(int count) {
            runOnUiThread(() -> {
                burstRemaining = Math.max(0, count - 1);
                openNativeCamera();
            });
        }
        
        @JavascriptInterface
        public void shareWhatsApp(String message, String phone) {
            runOnUiThread(() -> openWhatsApp(message, phone));
        }

        @JavascriptInterface
        public void printPage() {
            runOnUiThread(() -> printCurrentPage());
        }

        @JavascriptInterface
        public String getAppVersionName() {
            try {
                return getPackageManager().getPackageInfo(getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "1.0";
            }
        }

        @JavascriptInterface
        public void triggerUpdate(final String urlStr) {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    if (!getPackageManager().canRequestPackageInstalls()) {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                        intent.setData(Uri.parse("package:" + getPackageName()));
                        startActivity(intent);
                        android.widget.Toast.makeText(MainActivity.this, "Please enable permission to install updates, then check for updates again.", android.widget.Toast.LENGTH_LONG).show();
                        return;
                    }
                }
                new Thread(() -> downloadAndInstallApk(urlStr)).start();
            });
        }
    }

    private void downloadAndInstallApk(String urlStr) {
        try {
            runOnUiThread(() -> webView.evaluateJavascript("if(typeof onUpdateProgress === 'function') onUpdateProgress('Downloading...');", null));
            
            URL url = new URL(urlStr);
            HttpURLConnection c = (HttpURLConnection) url.openConnection();
            c.setRequestMethod("GET");
            c.connect();

            File cacheDir = getCacheDir();
            final File apkFile = new File(cacheDir, "update.apk");
            if (apkFile.exists()) {
                apkFile.delete();
            }

            InputStream is = c.getInputStream();
            FileOutputStream fos = new FileOutputStream(apkFile);

            byte[] buffer = new byte[4096];
            int len;
            while ((len = is.read(buffer)) != -1) {
                fos.write(buffer, 0, len);
            }
            fos.close();
            is.close();

            runOnUiThread(() -> webView.evaluateJavascript("if(typeof onUpdateProgress === 'function') onUpdateProgress('Installing...');", null));
            runOnUiThread(() -> installApk(apkFile));
        } catch (final Exception e) {
            runOnUiThread(() -> {
                android.widget.Toast.makeText(MainActivity.this, "Update failed: " + e.getMessage(), android.widget.Toast.LENGTH_LONG).show();
                webView.evaluateJavascript("if(typeof onUpdateProgress === 'function') onUpdateProgress('Failed');", null);
            });
        }
    }

    private void installApk(File apkFile) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                Uri apkUri = FileProvider.getUriForFile(
                    this,
                    getPackageName() + ".fileprovider",
                    apkFile
                );
                intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                intent.setDataAndType(Uri.fromFile(apkFile), "application/vnd.android.package-archive");
            }
            startActivity(intent);
        } catch (Exception e) {
            android.widget.Toast.makeText(this, "Failed to start installer: " + e.getMessage(), android.widget.Toast.LENGTH_LONG).show();
        }
    }

    private void openNativeCamera() {
        // ✅ Use in-app CameraX activity — guaranteed back camera on all OEMs
        Intent cameraIntent = new Intent(this, CameraActivity.class);
        startActivityForResult(cameraIntent, CAMERA_REQUEST_CODE);
    }

    // ✅ PERFORMANCE FIX: Compress image in Java BEFORE base64 conversion
    // This dramatically reduces memory usage by sending smaller base64 strings
    private String compressAndEncodeImage() {
        if (currentPhotoPath == null) {
            return null;
        }
        
        try {
            File photoFile = new File(currentPhotoPath);
            if (!photoFile.exists()) {
                return null;
            }
            
            // Decode image into Bitmap
            android.graphics.BitmapFactory.Options options = new android.graphics.BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            android.graphics.BitmapFactory.decodeFile(currentPhotoPath, options);
            
            // Calculate sample size for initial decode
            int maxDimension = 720;
            int scale = 1;
            while (options.outWidth / scale > maxDimension || options.outHeight / scale > maxDimension) {
                scale *= 2;
            }
            
            // Decode with sample size
            options.inJustDecodeBounds = false;
            options.inSampleSize = scale;
            android.graphics.Bitmap bitmap = android.graphics.BitmapFactory.decodeFile(currentPhotoPath, options);
            
            if (bitmap == null) {
                return null;
            }
            
            // Calculate final dimensions (max 900px)
            int width = bitmap.getWidth();
            int height = bitmap.getHeight();
            float ratio = Math.min((float) maxDimension / width, (float) maxDimension / height);
            
            if (ratio < 1.0f) {
                int newWidth = Math.round(width * ratio);
                int newHeight = Math.round(height * ratio);
                bitmap = android.graphics.Bitmap.createScaledBitmap(bitmap, newWidth, newHeight, true);
            }
            
            // Compress to JPEG with 60% quality for faster transfer to JS
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
            bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 60, baos);
            byte[] imageBytes = baos.toByteArray();
            
            // Clean up
            bitmap.recycle();
            baos.close();
            
            // Convert to base64
            String base64 = android.util.Base64.encodeToString(imageBytes, android.util.Base64.NO_WRAP);
            
            // Return data URL
            return "data:image/jpeg;base64," + base64;
            
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
    
    private void openWhatsApp(String message, String phone) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW);
            String url;
            
            if (phone != null && !phone.isEmpty()) {
                // Send to specific number
                url = "https://wa.me/" + phone + "?text=" + android.net.Uri.encode(message);
            } else {
                // Open WhatsApp with message (user selects contact)
                url = "https://wa.me/?text=" + android.net.Uri.encode(message);
            }
            
            intent.setData(android.net.Uri.parse(url));
            intent.setPackage("com.whatsapp");
            startActivity(intent);
        } catch (Exception e) {
            e.printStackTrace();
            // Fallback: try without package restriction
            try {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                String url = phone != null && !phone.isEmpty()
                    ? "https://wa.me/" + phone + "?text=" + android.net.Uri.encode(message)
                    : "https://wa.me/?text=" + android.net.Uri.encode(message);
                intent.setData(android.net.Uri.parse(url));
                startActivity(intent);
            } catch (Exception ex) {
                ex.printStackTrace();
            }
        }
    }

    private void printCurrentPage() {
        if (webView == null) return;
        try {
            PrintManager printManager = (PrintManager) getSystemService(Context.PRINT_SERVICE);
            if (printManager == null) return;

            String jobName = getString(R.string.app_name) + " Receipt";
            PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(jobName);
            PrintAttributes attributes = new PrintAttributes.Builder().build();
            printManager.print(jobName, printAdapter, attributes);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private boolean handleExternalUrl(Uri uri) {
        if (uri == null || uri.getScheme() == null) {
            return false;
        }

        String scheme = uri.getScheme().toLowerCase(Locale.ROOT);
        if ("tel".equals(scheme) || "telprompt".equals(scheme)) {
            try {
                startActivity(new Intent(Intent.ACTION_DIAL, uri));
            } catch (Exception e) {
                e.printStackTrace();
            }
            return true;
        }

        return false;
    }

    private void requestPermissions() {
        String[] permissions;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions = new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.READ_MEDIA_IMAGES
            };
        } else {
            permissions = new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.READ_EXTERNAL_STORAGE
            };
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            boolean needsPermission = false;
            for (String permission : permissions) {
                if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                    needsPermission = true;
                    break;
                }
            }
            if (needsPermission) {
                ActivityCompat.requestPermissions(this, permissions, PERMISSION_REQUEST_CODE);
            }
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == CAMERA_REQUEST_CODE) {
            if (resultCode == RESULT_OK && data != null) {
                String path = data.getStringExtra(CameraActivity.EXTRA_PHOTO_PATH);
                if (path != null) {
                    currentPhotoPath = path;
                    String dataUrl = compressAndEncodeImage();
                    if (dataUrl != null) {
                        webView.evaluateJavascript(
                            "if(window.handleCameraResult){window.handleCameraResult('" + dataUrl + "');}",
                            null
                        );
                        if (burstRemaining > 0) {
                            burstRemaining--;
                            webView.postDelayed(this::openNativeCamera, 500);
                        }
                    } else {
                        webView.evaluateJavascript(
                            "toast('❌ Failed to load photo');",
                            null
                        );
                    }
                }
            } else {
                burstRemaining = 0;
            }
        } else if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (filePathCallback == null) return;
            
            Uri[] results = null;
            if (resultCode == RESULT_OK && data != null) {
                ClipData clipData = data.getClipData();
                if (clipData != null) {
                    int count = clipData.getItemCount();
                    results = new Uri[count];
                    for (int i = 0; i < count; i++) {
                        results[i] = clipData.getItemAt(i).getUri();
                    }
                } else if (data.getData() != null) {
                    results = new Uri[]{data.getData()};
                } else {
                    String dataString = data.getDataString();
                    if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
            }
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView == null) {
            super.onBackPressed();
            return;
        }

        webView.evaluateJavascript(
            "(function(){return !!(window.handleBackButton && window.handleBackButton());})()",
            handled -> {
                if ("true".equals(handled)) {
                    return;
                }
                performDefaultBackAction();
            }
        );
    }

    private void performDefaultBackAction() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
