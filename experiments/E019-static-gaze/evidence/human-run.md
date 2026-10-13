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

## v2 真人觀察釐清

- 真人原話：「頭是面對的 只是 臉是靠下的 不是中間」。
- 有界判讀：v2當前頭部面向觀察者；臉部圖案偏下是另外的視覺觀察，不等同頭部低頭。未修改臉部圖案位置或SDK。
- 這是當前v2畫面的口頭觀察，不能回改v1 run #1「不符合」，也不能當成尚未執行的lookAt方向結果。後續仍需同次操作與人工方向判定。

## v2 起始準備確認

- run ID：E019-2026-10-13T07-53-36-719Z；Andrew操作 #1 prepare。
- 413035ms begin；413039ms WasmDriver applyRotation y=0 p=0 r=0 time=0.5；413053ms returned；418055ms window-ended。
- 449461ms 頁面真人判定：符合。Owner另回覆「準備好了」。
- 此次v2起始準備已確認；第一個正式方向樣本尚未執行。v1原「不符合」不變更。

## Robot 左：第一次

- 同一v2 run；Andrew操作 #2 look，target=left，point=[0.5,0.5,0] m；起始準備為已確認的 #1。
- 534731ms begin；534735ms WasmDriver applyRotation y=0.7853981633974483 p=0 r=0 time=0.8039466025326152；534736ms returned；539738ms window-ended。
- 548891ms 頁面真人判定：符合。Owner口頭回覆：「向右」（觀察者畫面右方，對應Robot左）。
- 本項方向判定符合，記為左1/2；未據此宣稱其他方向或再次指定通過。

## Robot 左：第二次

- 同一v2 run；Andrew操作 #3 prepare：791536ms applyRotation y=0 p=0 r=0；796554ms window-ended；797214ms真人判定符合。
- 操作 #4 look，target=left，point=[0.5,0.5,0] m。813966ms begin；813969ms applyRotation y=0.7853981633974483 p=0 r=0 time=0.9177067253821095；813970ms returned；818972ms window-ended。
- 819785ms 頁面真人判定：符合。Owner另回覆「方向符合」。
- Robot左方向：2/2真人判定符合；原始同次畫面素材尚未核對保存，不宣稱全部證據驗收完成。Robot右、上、下及真人解除／再次指定尚未驗證。

## Robot 右：第一次

- 同一v2 run；Andrew操作 #5 prepare：878942ms applyRotation y=0 p=0 r=0；883965ms window-ended；884502ms真人判定符合。
- 操作 #6 look，target=right，point=[0.5,-0.5,0] m。891513ms begin；891520ms applyRotation y=-0.7853981633974483 p=0 r=0 time=0.6787990444241088；891525ms returned；896530ms window-ended。
- 899514ms 頁面真人判定：符合。Owner另回覆「方向符合」。
- Robot右方向：1/2真人判定符合。原始同次畫面素材仍待核對保存；不宣稱全部證據驗收完成。

## Robot 右：第二次

- 同一v2 run；Andrew操作 #7 prepare：1018146ms applyRotation y=0 p=0 r=0；1023169ms window-ended；1023635ms真人判定符合。
- 操作 #8 look，target=right，point=[0.5,-0.5,0] m。1033710ms begin；1033713ms applyRotation y=-0.7853981633974483 p=0 r=0 time=0.8053468867695643；1033714ms returned；1038717ms window-ended。
- 1044294ms 頁面真人判定：符合。Owner另回覆「方向符合」。
- Robot右方向：2/2真人判定符合。左右共4個有效方向判定；上、下與真人解除／再次指定尚未驗證，畫面素材保存仍待核對。

## 上：第一次

- 同一v2 run；Andrew操作 #9 prepare：1141232ms applyRotation y=0 p=0 r=0；1146249ms window-ended；1157509ms真人判定符合。
- 操作 #10 look，target=up，point=[0.5,0,0.5] m。1170885ms begin；1170888ms applyRotation y=0 p=-0.7853981633974483 r=0 time=0.7395240735446681並returned；1175891ms window-ended。
- 1176409ms 頁面真人判定：符合。Owner另回覆「方向符合」。
- 上方向：1/2真人判定符合。另觀察到同一向上rotation在窗口結束後仍重複送出；這不影響已取得的方向觀察，但不能宣稱動作已完成或SDK已停止更新。下次獨立樣本仍需解除與起始準備。

## 上：第二次

- 同一v2 run；Andrew操作 #11 prepare：1214582ms applyRotation y=0 p=0 r=0；1219606ms window-ended；1223820ms真人判定符合。
- 操作 #12 look，target=up，point=[0.5,0,0.5] m。1229499ms begin；1229501ms applyRotation y=0 p=-0.7853981633974483 r=0 time=0.6382300791508658；1229502ms returned；1234505ms window-ended。
- 1235834ms 頁面真人判定：符合。Owner另回覆「方向符合」。
- 上方向：2/2真人判定符合。窗口後仍有相同向上rotation重複送出，未宣稱SDK動作完成。左右與上共6個方向判定符合；下與真人解除／再次指定尚未驗證，畫面素材仍待核對保存。

## 下：第一次

- 同一v2 run；Andrew操作 #13 prepare：1279490ms applyRotation y=0 p=0 r=0；1284506ms window-ended；1284990ms真人判定符合。
- 操作 #14 look，target=down，point=[0.5,0,-0.5] m。1296133ms begin；1296138ms applyRotation y=0 p=0.7853981633974483 r=0 time=0.9025915357761978；1296139ms returned；1301144ms window-ended。
- 1317378ms 頁面真人判定：符合。Owner另回覆「方向符合」。
- 下方向：1/2真人判定符合。窗口後仍重複送出同一向下rotation，未宣稱動作完成。
- 已由頁面下載完整partial JSON並保存human-final.json（最終完整匯出涵蓋當時快照），核對先前被畫面120行上限截去的#13起始紀錄。畫面素材仍待核對保存。

## 下：第二次與四方向小結

- 同一v2 run；Andrew操作 #15 prepare、#16 look/down。完整輸出已保存 human-final.json（包含四方向完成時的完整紀錄）。
- 1382642ms #15 COAMI19|{"seq":15,"kind":"prepare","phase":"begin"}
- 1382643ms #15 [WasmDriver] applyRotation y=0 p=0 r=0 time=0.5
- 1382659ms #15 COAMI19|{"seq":15,"kind":"prepare","phase":"returned"}
- 1387664ms #15 COAMI19|{"seq":15,"kind":"prepare","phase":"window-ended"}
- 1474263ms #15 人工判定 operator=Andrew result=符合
- 1478028ms #15 COAMI19|{"phase":"selected","selection":0,"target":"left"}
- 1478296ms #15 COAMI19|{"phase":"selected","selection":1,"target":"right"}
- 1478568ms #15 COAMI19|{"phase":"selected","selection":2,"target":"up"}
- 1497862ms #16 人工判定 operator=Andrew result=符合
- Owner另回覆「方向符合」。四方向各兩次，共8個真人方向判定均符合；此結論僅限從獨立正面起始的方向樣本。真人解除／再次指定尚未驗證，原始同次畫面素材仍待核對，不將方向小結當作整體實驗成功。

## 左→解除→右：建立左目標

- 同一v2 run；#17 prepare：1622613ms applyRotation y=0 p=0 r=0；1627634ms window-ended；1628320ms真人判定符合。
- #18 look/left [0.5,0.5,0]：1636711ms begin；1636713ms applyRotation y=0.7853981633974483 p=0 r=0 time=0.5851899315999773；1636714ms returned；1641721ms window-ended；1648737ms真人判定符合。Owner回覆「方向符合」。
- 僅確認本組左目標；解除及直接右側再指定尚未執行，不提前判定整組通過。

## 左→解除→右：解除

- 同一v2 run；#19 away：1715793ms begin；1715794ms returned；1720798ms window-ended；1724870ms頁面判定未確認（解除僅記錄）。
- 真人原話：「解除呼叫已返回；清除語意見契約測試 面還是持續靠右」。
- 只記錄解除呼叫返回與頭仍朝觀察者右側；不把保留姿勢當成解除失敗，也不以畫面不動證明gaze point清除。清除契約證據仍來自真實pinned controller測試。
- #18左 → #19解除，中間無prepare；直接右側再指定尚待執行。

## 左→解除→右：直接再指定右目標

- 同一v2 run；#20 look/right [0.5,-0.5,0]：1834153ms begin；1834157ms applyRotation y=-0.7853981633974483 p=0 r=0 time=0.9786781337944224；1834158ms returned；1839160ms window-ended；1841534ms真人判定符合。Owner回覆「方向符合」。
- #18左 → #19解除 → #20右，中間無prepare／setPose；本組再次指定的SDK路徑與真人方向判定符合。
- 上→解除→下仍待真人驗證；未以本組結果推翻先前自動驗證的垂直再指定失敗。

## 上→解除→下：建立上目標

- 同一v2 run；#21 prepare：1906757ms applyRotation y=0 p=0 r=0；1911776ms window-ended；1914100ms真人判定符合。
- #22 look/up [0.5,0,0.5]：1920426ms begin；1920432ms applyRotation y=0 p=-0.7853981633974483 r=0 time=0.754629511039066；1920433ms returned；1925443ms window-ended；1926436ms真人判定符合。
- Owner回覆「方向符合」；本組上目標已確認。解除與直接向下再指定尚未執行，不預判結果。

## 上→解除→下：解除

- 同一v2 run；#23 away：2065134ms begin；2065135ms returned；2065813ms既有移動setTorque=0收尾；2070140ms window-ended；2071686ms頁面真人結果未確認（解除僅記錄）。
- Owner回覆「解除訊息 仍抬頭」；頁面顯示「解除呼叫已返回；清除語意見契約測試」。
- #22上 → #23解除，中間無prepare；維持頭部方向不當作解除成功／失敗證據。直接下目標尚未指定。

## 上→解除→下：直接再指定下目標與最終判定

- 同一v2 run；#24 look/down [0.5,0,-0.5]：2140911ms begin；2140913ms returned；2145920ms window-ended；2154339ms真人判定不符合。
- Owner原話：「仍抬頭」。完整human-final.json核對：#24沒有任何WasmDriver applyRotation。
- #22上 → #23解除 → #24下，中間沒有prepare／setPose。真人重現既有垂直再指定失敗；沒有以回正或SDK修正改判。

## 真人驗證結論

- 四方向各兩次（#2、4、6、8、10、12、14、16）：8/8真人判定符合。
- 左→解除→右（#18、19、20）：呼叫與再次指定方向符合；解除僅記呼叫返回，清除語意由契約測試支持。
- 上→解除→下（#22、23、24）：FAIL，接受新下目標但沒有新rotation，真人仍見抬頭。
- 觀察條件v2只改鏡頭及顯示區；v1初次起始不符合原紀錄保留。完整最終匯出：human-final.json。
- 真人方向判定與兩組操作已完成；本輪驗證任務完成，實驗整體仍為失敗。八個原始同次真人畫面檔沒有完整保存，列為證據限制，不聲稱全部Acceptance Criteria通過。最後失敗畫面曾以CUA檢視，未當作已提交的PNG證據。

- 中間匯出快照經records與observations前綴逐項比對，均完整包含於human-final.json；中間檔移至ignored web/generated/human-partial-archive，保留最終完整原始匯出供review，未丟失事件。

- 最終原始匯出：1881 records、24 observations；SHA-256 `9a8908578f2d3207f07abc590fe879cbba58da2a29a60635b85e9fb79f5fdbd7`。資料核對確認每個四方向樣本前有獨立prepare且真人符合，#19/#23解除僅記錄，#20符合，#24不符合且無rotation。
