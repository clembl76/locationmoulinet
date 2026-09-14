Add-Type -AssemblyName System.Drawing

function Resize-CropJpeg {
    param(
        [string]$InPath,
        [string]$OutPath,
        [int]$TargetW,
        [int]$TargetH,
        [double]$FocusX = 0.5,   # 0..1 crop window center within source, horizontal
        [double]$FocusY = 0.42,  # 0..1 crop window center within source, vertical
        [long]$MaxBytes = 70000
    )

    $src = [System.Drawing.Image]::FromFile($InPath)
    $srcW = $src.Width
    $srcH = $src.Height

    $targetRatio = $TargetW / $TargetH
    $srcRatio = $srcW / $srcH

    if ($srcRatio -gt $targetRatio) {
        # source wider than target -> crop width
        $cropH = $srcH
        $cropW = [int]($srcH * $targetRatio)
    } else {
        $cropW = $srcW
        $cropH = [int]($srcW / $targetRatio)
    }

    $cropX = [int](($srcW - $cropW) * $FocusX)
    $cropY = [int](($srcH - $cropH) * $FocusY)
    if ($cropX -lt 0) { $cropX = 0 }
    if ($cropY -lt 0) { $cropY = 0 }
    if ($cropX + $cropW -gt $srcW) { $cropX = $srcW - $cropW }
    if ($cropY + $cropH -gt $srcH) { $cropY = $srcH - $cropH }

    $cropRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
    $cropped = New-Object System.Drawing.Bitmap($cropW, $cropH)
    $g = [System.Drawing.Graphics]::FromImage($cropped)
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0,0,$cropW,$cropH)), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    $resized = New-Object System.Drawing.Bitmap($TargetW, $TargetH)
    $g2 = [System.Drawing.Graphics]::FromImage($resized)
    $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g2.DrawImage($cropped, 0, 0, $TargetW, $TargetH)
    $g2.Dispose()

    $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
    $quality = 82L
    do {
        $encParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, $quality)
        $resized.Save($OutPath, $jpegCodec, $encParams)
        $size = (Get-Item $OutPath).Length
        if ($size -gt $MaxBytes) { $quality -= 8 }
    } while ($size -gt $MaxBytes -and $quality -gt 20)

    Write-Host "$OutPath : ${TargetW}x${TargetH}, quality=$quality, bytes=$size"

    $resized.Dispose()
    $cropped.Dispose()
    $src.Dispose()
}

Resize-CropJpeg -InPath "rouen-gros-horloge-full.jpg" -OutPath "rouen-wide.jpg" -TargetW 1200 -TargetH 380 -FocusY 0.40
Resize-CropJpeg -InPath "rouen-gros-horloge-full.jpg" -OutPath "rouen-portrait.jpg" -TargetW 560 -TargetH 700 -FocusY 0.40
Resize-CropJpeg -InPath "rouen-gros-horloge-full.jpg" -OutPath "rouen-square.jpg" -TargetW 460 -TargetH 460 -FocusY 0.42
Resize-CropJpeg -InPath "rouen-gros-horloge-full.jpg" -OutPath "rouen-tall-hero.jpg" -TargetW 760 -TargetH 840 -FocusY 0.38
Resize-CropJpeg -InPath "rouen-gros-horloge-full.jpg" -OutPath "rouen-banner-short.jpg" -TargetW 1100 -TargetH 230 -FocusY 0.36
Resize-CropJpeg -InPath "rouen-gare-full.jpg" -OutPath "rouen-gare-square.jpg" -TargetW 460 -TargetH 460 -FocusY 0.44
