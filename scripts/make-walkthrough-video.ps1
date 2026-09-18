# Generates public/videos/ylt-partner-walkthrough.mp4 + poster jpg (YLT-branded title cards).
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$outDir = Join-Path $root 'public\videos'
$work = Join-Path $env:TEMP 'ylt-walkthrough-slides'
New-Item -ItemType Directory -Force -Path $outDir, $work | Out-Null

$ffmpeg = @(
  "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-full_build\bin\ffmpeg.exe",
  "$env:LOCALAPPDATA\Microsoft\WinGet\Links\ffmpeg.exe",
  'C:\ffmpeg\bin\ffmpeg.exe'
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $ffmpeg) {
  $cmd = Get-Command ffmpeg -ErrorAction SilentlyContinue
  if ($cmd) { $ffmpeg = $cmd.Source }
}
if (-not $ffmpeg) { throw 'ffmpeg not found' }

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing.dll -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;

public static class YltWalkthroughSlides
{
    static readonly Color Deep = Color.FromArgb(7, 20, 40);
    static readonly Color Navy = Color.FromArgb(11, 31, 58);
    static readonly Color Raised = Color.FromArgb(22, 58, 98);
    static readonly Color CardBg = Color.FromArgb(16, 40, 72);
    static readonly Color Gold = Color.FromArgb(212, 160, 23);
    static readonly Color GoldLt = Color.FromArgb(245, 193, 74);
    static readonly Color Crimson = Color.FromArgb(196, 30, 58);
    static readonly Color White = Color.FromArgb(246, 247, 249);
    static readonly Color Muted = Color.FromArgb(197, 212, 232);
    static readonly Color Line = Color.FromArgb(70, 212, 160, 23);

    static GraphicsPath RoundPath(Rectangle r, int radius)
    {
        var path = new GraphicsPath();
        int d = Math.Max(2, radius * 2);
        path.AddArc(r.X, r.Y, d, d, 180, 90);
        path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }

    static void FillRound(Graphics g, Brush fill, Rectangle r, int radius)
    {
        using (var path = RoundPath(r, radius)) g.FillPath(fill, path);
    }

    static void StrokeRound(Graphics g, Pen pen, Rectangle r, int radius)
    {
        using (var path = RoundPath(r, radius)) g.DrawPath(pen, path);
    }

    static Font F(string family, float px, FontStyle style)
    {
        return new Font(family, px, style, GraphicsUnit.Pixel);
    }

    static void DrawLogo(Graphics g, int x, int y, int size)
    {
        var box = new Rectangle(x, y, size, size);
        using (var b = new SolidBrush(Navy)) FillRound(g, b, box, 14);
        using (var p = new Pen(Gold, 3f)) StrokeRound(g, p, new Rectangle(x + 3, y + 3, size - 6, size - 6), 12);
        using (var font = F("Arial", size * 0.34f, FontStyle.Bold))
        using (var br = new SolidBrush(GoldLt))
        using (var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
        {
            g.DrawString("YLT", font, br, new RectangleF(x, y + 2, size, size - 8), sf);
        }
        using (var p = new Pen(Gold, 2.2f))
        {
            int pad = size / 5;
            g.DrawLine(p, x + pad, y + size - pad, x + size - pad, y + size - pad);
        }
    }

    static void Chrome(Graphics g, string kicker)
    {
        using (var bg = new LinearGradientBrush(new Rectangle(0, 0, 1280, 720), Deep, Navy, 52f))
            g.FillRectangle(bg, 0, 0, 1280, 720);
        using (var crimson = new SolidBrush(Crimson)) g.FillRectangle(crimson, 0, 0, 12, 720);
        using (var gold = new SolidBrush(Gold)) g.FillRectangle(gold, 0, 0, 1280, 7);
        DrawLogo(g, 48, 32, 68);
        using (var title = F("Segoe UI", 26, FontStyle.Bold))
        using (var br = new SolidBrush(GoldLt))
            g.DrawString("YLT Travels", title, br, 132, 38);
        using (var sub = F("Segoe UI", 16, FontStyle.Regular))
        using (var br = new SolidBrush(Muted))
            g.DrawString(kicker, sub, br, 132, 74);
        using (var p = new Pen(Line, 2f)) g.DrawLine(p, 48, 118, 1232, 118);
        using (var foot = F("Segoe UI", 14, FontStyle.Regular))
        using (var br = new SolidBrush(Color.FromArgb(160, Muted)))
            g.DrawString("ylttravels.com  |  Partner onboarding  |  Tirupati", foot, br, 48, 678);
    }

    static void Caption(Graphics g, string title, string body)
    {
        using (var h = F("Segoe UI", 42, FontStyle.Bold))
        using (var br = new SolidBrush(White))
            g.DrawString(title, h, br, new RectangleF(48, 140, 1180, 70));
        using (var b = F("Segoe UI", 24, FontStyle.Regular))
        using (var br = new SolidBrush(Muted))
            g.DrawString(body, b, br, new RectangleF(48, 210, 1180, 90));
    }

    static void DrawCard(Graphics g, Rectangle r, string kicker, string title, string body)
    {
        using (var fill = new SolidBrush(CardBg)) FillRound(g, fill, r, 18);
        using (var p = new Pen(Line, 1.5f)) StrokeRound(g, p, r, 18);
        using (var k = F("Segoe UI", 14, FontStyle.Bold))
        using (var br = new SolidBrush(Gold))
            g.DrawString(kicker, k, br, r.X + 22, r.Y + 18);
        using (var t = F("Segoe UI", 22, FontStyle.Bold))
        using (var br = new SolidBrush(White))
            g.DrawString(title, t, br, new RectangleF(r.X + 22, r.Y + 42, r.Width - 44, 40));
        using (var b = F("Segoe UI", 16, FontStyle.Regular))
        using (var br = new SolidBrush(Muted))
            g.DrawString(body, b, br, new RectangleF(r.X + 22, r.Y + 86, r.Width - 44, r.Height - 108));
    }

    static Bitmap NewBmp()
    {
        return new Bitmap(1280, 720, PixelFormat.Format24bppRgb);
    }

    static Graphics Gfx(Bitmap bmp)
    {
        var g = Graphics.FromImage(bmp);
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        g.CompositingQuality = CompositingQuality.HighQuality;
        return g;
    }

    public static void WriteAll(string dir)
    {
        Slide01(dir);
        Slide02(dir);
        Slide03(dir);
        Slide04(dir);
        Slide05(dir);
        Slide06(dir);
        Slide07(dir);
        Slide08(dir);
        Slide09(dir);
    }

    static void Slide01(string dir)
    {
        using (var bmp = NewBmp())
        using (var g = Gfx(bmp))
        {
            using (var bg = new LinearGradientBrush(new Rectangle(0, 0, 1280, 720), Deep, Color.FromArgb(20, 48, 82), 50f))
                g.FillRectangle(bg, 0, 0, 1280, 720);
            using (var crimson = new SolidBrush(Crimson)) g.FillRectangle(crimson, 0, 0, 12, 720);
            using (var gold = new SolidBrush(Gold)) g.FillRectangle(gold, 0, 0, 1280, 8);
            DrawLogo(g, 556, 118, 168);
            using (var k = F("Segoe UI", 18, FontStyle.Bold))
            using (var br = new SolidBrush(Gold))
            using (var sf = new StringFormat { Alignment = StringAlignment.Center })
                g.DrawString("YLT PARTNER", k, br, new RectangleF(0, 310, 1280, 32), sf);
            using (var h = F("Segoe UI", 54, FontStyle.Bold))
            using (var br = new SolidBrush(White))
            using (var sf = new StringFormat { Alignment = StringAlignment.Center })
                g.DrawString("Partner product walkthrough", h, br, new RectangleF(60, 348, 1160, 70), sf);
            using (var s = F("Segoe UI", 24, FontStyle.Regular))
            using (var br = new SolidBrush(Muted))
            using (var sf = new StringFormat { Alignment = StringAlignment.Center })
                g.DrawString("Onboarding and Partner ERP  |  Apply  ->  Review  ->  Go live", s, br, new RectangleF(60, 430, 1160, 40), sf);
            using (var s = F("Segoe UI", 18, FontStyle.Regular))
            using (var br = new SolidBrush(Color.FromArgb(180, Muted)))
            using (var sf = new StringFormat { Alignment = StringAlignment.Center })
                g.DrawString("Bus from-to setup  |  Availability and bookings  |  30-minute idle security", s, br, new RectangleF(60, 478, 1160, 36), sf);
            using (var foot = F("Segoe UI", 16, FontStyle.Regular))
            using (var br = new SolidBrush(GoldLt))
            using (var sf = new StringFormat { Alignment = StringAlignment.Center })
                g.DrawString("YLT Travels  |  Tirupati  |  South India", foot, br, new RectangleF(0, 640, 1280, 28), sf);
            bmp.Save(System.IO.Path.Combine(dir, "slide01.png"), ImageFormat.Png);
        }
    }

    static void Slide02(string dir)
    {
        using (var bmp = NewBmp())
        using (var g = Gfx(bmp))
        {
            Chrome(g, "How partner onboarding works");
            Caption(g, "Three steps to Partner ERP", "YLT reviews every application before ERP access is granted.");
            DrawCard(g, new Rectangle(48, 320, 370, 300), "STEP 1", "Apply", "Company, city, mobile, and GST or PAN on the partner landing.");
            DrawCard(g, new Rectangle(455, 320, 370, 300), "STEP 2", "Review", "CoreAdmin or Onboard staff approve or reject with a reason by email.");
            DrawCard(g, new Rectangle(862, 320, 370, 300), "STEP 3", "Go live", "Sign in with password or email OTP. Partner ERP stays locked until approval.");
            bmp.Save(System.IO.Path.Combine(dir, "slide02.png"), ImageFormat.Png);
        }
    }

    static void Slide03(string dir)
    {
        using (var bmp = NewBmp())
        using (var g = Gfx(bmp))
        {
            Chrome(g, "1  |  Apply");
            Caption(g, "Submit a partner application", "Tell YLT who you are. You will not get ERP access until the application is approved.");
            string[] rows = {
                "Company name and operating city",
                "Mobile number for callbacks and sign-in",
                "GST or PAN for partner records",
                "Register from onboardvendor.ylttravels.com"
            };
            for (int i = 0; i < rows.Length; i++)
            {
                var r = new Rectangle(48, 320 + i * 78, 1184, 66);
                using (var fill = new SolidBrush(CardBg)) FillRound(g, fill, r, 14);
                using (var n = F("Segoe UI", 20, FontStyle.Bold))
                using (var br = new SolidBrush(GoldLt))
                    g.DrawString((i + 1).ToString("00"), n, br, r.X + 22, r.Y + 18);
                using (var t = F("Segoe UI", 22, FontStyle.Regular))
                using (var br = new SolidBrush(White))
                    g.DrawString(rows[i], t, br, r.X + 90, r.Y + 18);
            }
            bmp.Save(System.IO.Path.Combine(dir, "slide03.png"), ImageFormat.Png);
        }
    }

    static void Slide04(string dir)
    {
        using (var bmp = NewBmp())
        using (var g = Gfx(bmp))
        {
            Chrome(g, "2  |  Review");
            Caption(g, "YLT staff review every file", "CoreAdmin or Onboard approve, or reject with a written reason sent by email.");
            DrawCard(g, new Rectangle(48, 330, 570, 290), "APPROVE", "Application accepted", "When approved you can sign in and open Partner ERP for bus operations.");
            DrawCard(g, new Rectangle(662, 330, 570, 290), "REJECT", "Reason by email", "If declined, the email explains why. Fix the file and apply again if invited.");
            bmp.Save(System.IO.Path.Combine(dir, "slide04.png"), ImageFormat.Png);
        }
    }

    static void Slide05(string dir)
    {
        using (var bmp = NewBmp())
        using (var g = Gfx(bmp))
        {
            Chrome(g, "3  |  Go live");
            Caption(g, "Sign in after approval", "Use your password or an email OTP. Partner ERP stays locked until YLT says yes.");
            DrawCard(g, new Rectangle(48, 330, 570, 290), "SIGN IN", "Password or email OTP", "Staff and partners use the same YLT sign-in on the partner host.");
            DrawCard(g, new Rectangle(662, 330, 570, 290), "LOCKED", "ERP waits on approval", "Pending applications cannot open bus ops, inventory, or bookings.");
            bmp.Save(System.IO.Path.Combine(dir, "slide05.png"), ImageFormat.Png);
        }
    }

    static void Slide06(string dir)
    {
        using (var bmp = NewBmp())
        using (var g = Gfx(bmp))
        {
            Chrome(g, "Partner ERP  |  Bus configuration");
            Caption(g, "Set from-to for each service", "Origin, destination, coach type, and departure time live in Partner ERP.");
            using (var fill = new SolidBrush(CardBg)) FillRound(g, fill, new Rectangle(48, 318, 1184, 330), 18);
            using (var p = new Pen(Line, 1.5f)) StrokeRound(g, p, new Rectangle(48, 318, 1184, 330), 18);
            string[] heads = { "Route", "Coach", "Time", "Status" };
            string[][] rows = {
                new[] { "TPT  ->  CHN", "Volvo AC", "18:30", "Open" },
                new[] { "HYD  ->  BLR", "Sleeper", "21:00", "Filling" },
                new[] { "VJA  ->  MAA", "Seater", "22:15", "Open" }
            };
            int[] xs = { 80, 430, 760, 1000 };
            using (var hf = F("Segoe UI", 16, FontStyle.Bold))
            using (var br = new SolidBrush(Gold))
            {
                for (int i = 0; i < heads.Length; i++) g.DrawString(heads[i], hf, br, xs[i], 344);
            }
            using (var p = new Pen(Line, 1f)) g.DrawLine(p, 72, 380, 1208, 380);
            using (var rf = F("Segoe UI", 22, FontStyle.Bold))
            using (var sf = F("Segoe UI", 22, FontStyle.Regular))
            using (var white = new SolidBrush(White))
            using (var muted = new SolidBrush(Muted))
            using (var green = new SolidBrush(Color.FromArgb(52, 211, 153)))
            {
                for (int r = 0; r < rows.Length; r++)
                {
                    int y = 404 + r * 70;
                    g.DrawString(rows[r][0], rf, white, xs[0], y);
                    g.DrawString(rows[r][1], sf, muted, xs[1], y);
                    g.DrawString(rows[r][2], sf, muted, xs[2], y);
                    g.DrawString(rows[r][3], sf, green, xs[3], y);
                }
            }
            bmp.Save(System.IO.Path.Combine(dir, "slide06.png"), ImageFormat.Png);
        }
    }

    static void Slide07(string dir)
    {
        using (var bmp = NewBmp())
        using (var g = Gfx(bmp))
        {
            Chrome(g, "Partner ERP  |  Availability and bookings");
            Caption(g, "See open, held, and booked seats", "Inventory and bookings sit on one Partner ERP board after you go live.");
            string[] labels = { "Open seats", "Held", "Booked" };
            string[] nums = { "28", "4", "12" };
            for (int i = 0; i < 3; i++)
            {
                var r = new Rectangle(48 + i * 404, 330, 376, 280);
                using (var fill = new SolidBrush(CardBg)) FillRound(g, fill, r, 18);
                using (var p = new Pen(Line, 1.5f)) StrokeRound(g, p, r, 18);
                using (var n = F("Segoe UI", 72, FontStyle.Bold))
                using (var br = new SolidBrush(i == 2 ? GoldLt : White))
                    g.DrawString(nums[i], n, br, r.X + 28, r.Y + 70);
                using (var l = F("Segoe UI", 22, FontStyle.Regular))
                using (var br = new SolidBrush(Muted))
                    g.DrawString(labels[i], l, br, r.X + 32, r.Y + 180);
            }
            bmp.Save(System.IO.Path.Combine(dir, "slide07.png"), ImageFormat.Png);
        }
    }

    static void Slide08(string dir)
    {
        using (var bmp = NewBmp())
        using (var g = Gfx(bmp))
        {
            Chrome(g, "Access and security");
            Caption(g, "30-minute idle security", "A Partner ERP session ends after 30 minutes of inactivity. Sign in again to continue.");
            DrawCard(g, new Rectangle(48, 330, 570, 290), "IDLE TIMER", "30 minutes", "No mouse or keyboard activity for half an hour and YLT signs the session out.");
            DrawCard(g, new Rectangle(662, 330, 570, 290), "WHY", "Protect the operator desk", "Shared counters stay safer. You return through password or email OTP.");
            bmp.Save(System.IO.Path.Combine(dir, "slide08.png"), ImageFormat.Png);
        }
    }

    static void Slide09(string dir)
    {
        using (var bmp = NewBmp())
        using (var g = Gfx(bmp))
        {
            using (var bg = new LinearGradientBrush(new Rectangle(0, 0, 1280, 720), Deep, Color.FromArgb(18, 42, 72), 48f))
                g.FillRectangle(bg, 0, 0, 1280, 720);
            using (var crimson = new SolidBrush(Crimson)) g.FillRectangle(crimson, 0, 0, 12, 720);
            using (var gold = new SolidBrush(Gold)) g.FillRectangle(gold, 0, 0, 1280, 8);
            DrawLogo(g, 80, 80, 88);
            using (var t = F("Segoe UI", 28, FontStyle.Bold))
            using (var br = new SolidBrush(GoldLt))
                g.DrawString("YLT Travels", t, br, 188, 92);
            using (var s = F("Segoe UI", 18, FontStyle.Regular))
            using (var br = new SolidBrush(Muted))
                g.DrawString("Partner onboarding", s, br, 188, 132);
            using (var h = F("Segoe UI", 52, FontStyle.Bold))
            using (var br = new SolidBrush(White))
                g.DrawString("Ready to register?", h, br, 80, 250);
            using (var b = F("Segoe UI", 24, FontStyle.Regular))
            using (var br = new SolidBrush(Muted))
                g.DrawString("Submit a partner application. Partner ERP opens only after YLT approval.\nApply  ->  Review  ->  Go live  |  then buses, availability, and bookings.", b, br, new RectangleF(80, 330, 1120, 110));
            using (var fill = new SolidBrush(Gold)) FillRound(g, fill, new Rectangle(80, 480, 420, 72), 36);
            using (var bf = F("Segoe UI", 24, FontStyle.Bold))
            using (var br = new SolidBrush(Deep))
            using (var sf = new StringFormat { Alignment = StringAlignment.Center, LineAlignment = StringAlignment.Center })
                g.DrawString("onboardvendor.ylttravels.com", bf, br, new RectangleF(80, 480, 420, 72), sf);
            using (var foot = F("Segoe UI", 16, FontStyle.Regular))
            using (var br = new SolidBrush(GoldLt))
                g.DrawString("YLT Travels  |  Tirupati  |  ylttravels.com", foot, br, 80, 640);
            bmp.Save(System.IO.Path.Combine(dir, "slide09.png"), ImageFormat.Png);
        }
    }
}
'@
[YltWalkthroughSlides]::WriteAll($work)
Write-Host "slides written to $work"

$clips = Join-Path $work 'clips'
New-Item -ItemType Directory -Force -Path $clips | Out-Null
$list = Join-Path $work 'concat.txt'
$lines = New-Object System.Collections.Generic.List[string]
$durations = @(6,5,5,5,5,5.5,5.5,5,5)
for ($i = 1; $i -le 9; $i++) {
  $n = '{0:d2}' -f $i
  $png = Join-Path $work "slide$n.png"
  $mp4 = Join-Path $clips "clip$n.mp4"
  $d = $durations[$i - 1]
  $fadeOut = [math]::Max(0.2, $d - 0.4)
  $vf = "scale=1280:720,fps=30,format=yuv420p,fade=t=in:st=0:d=0.35,fade=t=out:st=${fadeOut}:d=0.35"
  & $ffmpeg -y -loop 1 -framerate 30 -t $d -i $png -vf $vf -c:v libx264 -profile:v high -pix_fmt yuv420p -preset medium -crf 23 -an $mp4
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg clip $n failed" }
  $lines.Add(("file '{0}'" -f ($mp4 -replace '\\','/')))
}
[IO.File]::WriteAllLines($list, $lines)

$mp4Out = Join-Path $outDir 'ylt-partner-walkthrough.mp4'
$poster = Join-Path $outDir 'ylt-partner-walkthrough.jpg'
& $ffmpeg -y -f concat -safe 0 -i $list -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 26 -movflags +faststart -an $mp4Out
if ($LASTEXITCODE -ne 0) { throw 'ffmpeg concat failed' }
& $ffmpeg -y -i (Join-Path $work 'slide01.png') -q:v 3 $poster
if ($LASTEXITCODE -ne 0) { throw 'ffmpeg poster failed' }

$probe = Join-Path (Split-Path $ffmpeg) 'ffprobe.exe'
$dur = & $probe -v error -show_entries format=duration -of default=nw=1:nk=1 $mp4Out
$size = (Get-Item $mp4Out).Length
Write-Host "VIDEO $mp4Out"
Write-Host "POSTER $poster"
Write-Host "DURATION $dur"
Write-Host "BYTES $size"
