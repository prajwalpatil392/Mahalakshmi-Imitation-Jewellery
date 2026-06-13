package com.mahalakshmi.rentals;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.ImageButton;
import android.widget.Button;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.google.common.util.concurrent.ListenableFuture;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.concurrent.ExecutionException;

/**
 * In-app camera activity using CameraX.
 * Always opens the rear (back) camera — guaranteed, regardless of OEM.
 * Returns the captured image file path via Intent extra "photoPath".
 */
public class CameraActivity extends AppCompatActivity {

    public static final String EXTRA_PHOTO_PATH = "photoPath";

    private ImageCapture imageCapture;
    private PreviewView previewView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_camera);

        previewView = findViewById(R.id.previewView);
        ImageButton captureBtn = findViewById(R.id.captureBtn);
        Button cancelBtn = findViewById(R.id.cancelBtn);

        captureBtn.setOnClickListener(v -> takePhoto());
        cancelBtn.setOnClickListener(v -> {
            setResult(RESULT_CANCELED);
            finish();
        });

        startCamera();
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> cameraProviderFuture =
                ProcessCameraProvider.getInstance(this);

        cameraProviderFuture.addListener(() -> {
            try {
                ProcessCameraProvider cameraProvider = cameraProviderFuture.get();

                Preview preview = new Preview.Builder().build();
                preview.setSurfaceProvider(previewView.getSurfaceProvider());

                imageCapture = new ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .setTargetRotation(getWindowManager().getDefaultDisplay().getRotation())
                        .build();

                // ✅ FORCED BACK CAMERA — Use strict requirement to prevent OEM front-camera default
                CameraSelector cameraSelector = new CameraSelector.Builder()
                        .requireLensFacing(CameraSelector.LENS_FACING_BACK)
                        .build();

                cameraProvider.unbindAll();
                cameraProvider.bindToLifecycle(this, cameraSelector, preview, imageCapture);

            } catch (ExecutionException | InterruptedException e) {
                Toast.makeText(this, "Camera failed to start", Toast.LENGTH_SHORT).show();
                setResult(RESULT_CANCELED);
                finish();
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void takePhoto() {
        if (imageCapture == null) return;

        File photoFile;
        try {
            photoFile = createImageFile();
        } catch (IOException e) {
            Toast.makeText(this, "Could not create image file", Toast.LENGTH_SHORT).show();
            return;
        }

        ImageCapture.OutputFileOptions outputOptions =
                new ImageCapture.OutputFileOptions.Builder(photoFile).build();

        imageCapture.takePicture(outputOptions, ContextCompat.getMainExecutor(this),
                new ImageCapture.OnImageSavedCallback() {
                    @Override
                    public void onImageSaved(ImageCapture.OutputFileResults results) {
                        Intent resultIntent = new Intent();
                        resultIntent.putExtra(EXTRA_PHOTO_PATH, photoFile.getAbsolutePath());
                        setResult(RESULT_OK, resultIntent);
                        finish();
                    }

                    @Override
                    public void onError(ImageCaptureException exception) {
                        Toast.makeText(CameraActivity.this, "Capture failed", Toast.LENGTH_SHORT).show();
                        setResult(RESULT_CANCELED);
                        finish();
                    }
                });
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "JPEG_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(null);
        return File.createTempFile(imageFileName, ".jpg", storageDir);
    }
}
