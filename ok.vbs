'true
Set WshShell = CreateObject("WScript.Shell")

' Tăng âm lượng lên mức tối đa (Mã phím 175 là Volume Up)
For i = 1 To 50
    WshShell.SendKeys chr(175)
Next

' Khởi tạo Windows Media Player để phát nhạc
Set wmp = CreateObject("WMPlayer.OCX")
' Sử dụng link raw từ github để có thể phát trực tiếp
wmp.URL = "https://raw.githubusercontent.com/Duyquoclite/upload/main/tieng_ma_cuoi-www_tiengdong_com.mp3"
wmp.settings.volume = 100
wmp.controls.play

' Chờ nhạc bắt đầu phát
Do While wmp.playState <> 3 And wmp.playState <> 1 And wmp.playState <> 10
    WScript.Sleep 500
Loop

' Giữ script chạy trong lúc nhạc đang phát
Do While wmp.playState = 3
    WScript.Sleep 1000
Loop
