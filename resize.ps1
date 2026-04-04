Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile("cover.png")
$bmp = New-Object System.Drawing.Bitmap($img, 800, 1200)
$bmp.Save("og-image.jpg", [System.Drawing.Imaging.ImageFormat]::Jpeg)
$img.Dispose()
$bmp.Dispose()
