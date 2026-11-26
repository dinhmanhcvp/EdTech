Attribute VB_Name = "ChuyenPDFsangCDR"
' Socratic Vision Board - batch convert the print kit (PDF, text already in curves) to CorelDRAW .cdr
' CorelDRAW X5 or newer: Tools > Macros > Macro Editor (Alt+F11) > File > Import File... > this .bas
' then Tools > Macros > Run Macro > ChuyenPDFsangCDR.ChuyenTatCa
' Each PDF opens at its own 1:1 page size (mm) and is saved next to it as .cdr; subfolders included.
Option Explicit

Private nOK As Long, nErr As Long, sErr As String

Public Sub ChuyenTatCa()
    Dim root As String
    root = InputBox("Duong dan thu muc ho so (vi du C:\Ho-so-thi-cong-Socratic-Corel):", "PDF -> CDR")
    If Len(root) = 0 Then Exit Sub
    If Right(root, 1) <> "\" Then root = root & "\"
    nOK = 0: nErr = 0: sErr = ""
    Optimization = True
    XuLyThuMuc CreateObject("Scripting.FileSystemObject").GetFolder(root)
    Optimization = False
    MsgBox "Da chuyen " & nOK & " file sang .cdr." & IIf(nErr > 0, vbCrLf & "Loi " & nErr & " file:" & sErr, ""), vbInformation, "PDF -> CDR"
End Sub

Private Sub XuLyThuMuc(fd As Object)
    Dim f As Object, sf As Object, doc As Document, dst As String
    For Each f In fd.Files
        If LCase(Right(f.Name, 4)) = ".pdf" Then
            dst = Left(f.Path, Len(f.Path) - 4) & ".cdr"
            On Error Resume Next
            Set doc = OpenDocument(f.Path)
            If Err.Number = 0 Then
                doc.Unit = cdrMillimeter
                doc.SaveAs dst
                doc.Close
                nOK = nOK + 1
            Else
                nErr = nErr + 1: sErr = sErr & vbCrLf & f.Name
                Err.Clear
            End If
            On Error GoTo 0
        End If
    Next
    For Each sf In fd.SubFolders
        XuLyThuMuc sf
    Next
End Sub
