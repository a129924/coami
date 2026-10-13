# E019 真人驗證：起始姿勢未確認

- 日期：2026-10-13；觀察者：Andrew（頁面填寫）。
- run ID：E019-2026-10-13T07-47-34-334Z；操作 #1：prepare。
- 頁面紀錄：begin → WasmDriver applyRotation y=0 p=0 r=0 time=0.5 → returned → window-ended。
- 真人原話：「我看不出來 是要我看 Robot 的臉 往哪裡嗎 他一直朝下」。
- 頁面人工結果：不符合（99829ms）。保留此結果，不以零旋轉命令覆蓋人工判定。
- 判讀：本次只執行起始準備，尚未執行四方向lookAt。命令值為零不能代替正面起始的人工確認；目前起始條件未確認，四方向正式樣本尚未開始。
- 下一步：釐清整個頭部／螢幕面朝向與眼珠位置的區別，先建立可辨識參考，再決定能否開始正式方向驗證。未變更SDK、判準或既有失敗結論。

## 起始觀察釐清與觀察視角修訂

- 真人補充：「整個螢幕面低頭」，不是只指眼珠位置。原run #1「不符合」維持。
- 來源查證：pinned simulator預設camera=[42,28,155]、target=[0,-6,0]，是斜上方視角；零driverRotation的tilt為0，screen mesh沒有額外旋轉。鏡頭是可能影響判讀的因素，不能以來源推翻真人觀察。
- 觀察條件 v2：只將E019 camera設成[0,0,200]、target=[0,0,0]並鎖定鏡頭；不寫入driverRotation、targetDriverRotation、head／tilt group，也不修改SDK。頁面明示版本並寫入本次evidence。
- 需新run重新確認起始姿勢；舊截圖與舊判定不改寫。v2的真人結果尚未取得。

- v2頁面已確認ready，new run ID：E019-2026-10-13T07-53-36-719Z；尚無MOD操作或新真人判定。模型區固定460px並sticky，避免頁面過高無法同時看到頭與腳座。
