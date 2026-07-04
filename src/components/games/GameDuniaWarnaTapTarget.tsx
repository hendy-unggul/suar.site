//+------------------------------------------------------------------+
//|                                    SmartSoldiers_EA_v9_64.mq5     |
//|  v9.64 VAN THARP + SMC CORE LOGIC                                  |
//|  Philosophy: Entry = probability tilt | Exit = profit determinant  |
//|  "90% retail methods are liquidity for whales - be the 10%"       |
//+------------------------------------------------------------------+
#property copyright "SmartSoldiers EA v9.64 VanTharp-SMC"
#property version   "9.64"
#property strict
#include <Trade/Trade.mqh>

//+------------------------------------------------------------------+
//| VAN THARP PRINCIPLES IMPLEMENTED:                                  |
//| 1. Position Sizing: Fixed % risk per trade (not fixed lot)        |
//| 2. R-Multiples: 1R = 50 pips, Target = +2R (100 pips)             |
//| 3. Portfolio Heat: Max 1 trade, 1 pair per quote currency        |
//| 4. Let Winners Run: Tiered trailing stop                        |
//| 5. Cut Losers Short: Fixed SL, cooldown after loss                |
//+------------------------------------------------------------------+

//+------------------------------------------------------------------+
//| SMC PRINCIPLES IMPLEMENTED:                                        |
//| 1. D1 Bias: Higher timeframe directional context                  |
//| 2. H4 Structure: Swing high/low + displacement confirmation       |
//| 3. FVG: Fair value gap for entry precision (optional)            |
//| 4. Killzone: Trade during liquid sessions only                    |
//| 5. News Blackout: Avoid macro-induced volatility                  |
//+------------------------------------------------------------------+

input group "=== MODE ==="
input int    EXECUTION_MODE    = 3;
input int    TRADE_MODE        = 2;

input group "=== PAIR (LOW VOLATILITY ONLY) ==="
input bool   SCAN_EURUSD       = true;
input bool   SCAN_AUDUSD       = true;
input bool   SCAN_USDCAD       = true;
input bool   SCAN_USDCHF       = true;      // [NEW] Low vol, safe haven
input bool   SCAN_EURGBP       = true;      // [NEW] Cross pair, low vol
input bool   SCAN_NZDUSD       = true;      // [NEW] Commodity, steady

input group "=== SYMBOL NAMES ==="
input string SYM_EURUSD        = "EURUSDmicro";
input string SYM_AUDUSD        = "AUDUSDmicro";
input string SYM_USDCAD        = "USDCADmicro";
input string SYM_USDCHF        = "USDCHFmicro";      // [NEW]
input string SYM_EURGBP        = "EURGBPmicro";      // [NEW]
input string SYM_NZDUSD        = "NZDUSDmicro";      // [NEW]

input group "=== L1: D1 BIAS (Probability Tilt) ==="
input double MIN_D1_BODY_RATIO = 0.25;
input bool   USE_D1_BIAS_FILTER = true;
// D1 filter = memiringkan koin ke arah yang benar
// 3-candle confirmation = tidak trade saat market netral

input group "=== L2: H4 SMC STRUCTURE ==="
input int    STRUCT_LOOKBACK   = 15;
input int    STRUCT_CONFIRM    = 3;
input double DISP_MIN_BODY_ATR = 0.4;
input double DISP_FVG_MIN_ATR  = 0.05;
input bool   REQUIRE_FVG       = false;
// Structure = institutional order flow confirmation
// FVG = precision entry zone (optional untuk avoid noise)

input group "=== VAN THARP: RISK MANAGEMENT ==="
input double RISK_PER_TRADE_PCT = 1.0;      // % account risk per trade
input double FIXED_SL_PIPS      = 50.0;      // 1R = 50 pips
input double FIXED_TP_PIPS      = 100.0;     // +2R = 100 pips
input bool   USE_FIXED_RR       = true;      // true = fixed SL/TP
input bool   USE_STRUCTURE_SL   = false;     // false = Van Tharp fixed R
// Van Tharp: "Your stop determines how large you can trade"
// Fixed R = predictable, testable, optimizable

input group "=== VAN THARP: PORTFOLIO HEAT ==="
input int    MAX_TRADES        = 1;           // [PHASE 1] Start with 1, expand to 2 after validation
input double MAX_DD_PCT        = 5.0;         // Max drawdown %
input int    COOLDOWN_HOURS    = 4;

input group "=== PHASE EXPANSION CONTROL ==="
input bool   ENABLE_AUTO_EXPAND = false;      // [PHASE 2] Set true after 2-week validation
input int    MIN_TRADES_FOR_EXPAND = 20;      // Minimum trades before expansion
input double MIN_EXPECTANCY_EXPAND = 0.15;    // Min expectancy (R) to allow expansion
input int    MAX_CONSEC_LOSS_EXPAND = 5;      // Max consecutive losses before blocking expansion
// SAFETY: EA will NOT auto-expand if metrics below threshold
// Manual override: Change MAX_TRADES input directly
// Max 1 trade = focus & discipline
// Cooldown = emotional protection after loss

input group "=== KILLZONE (Liquidity Windows) ==="
input int    KILLZONE_LONDON_START = 7;
input int    KILLZONE_LONDON_END   = 11;
input int    KILLZONE_NY_START     = 13;
input int    KILLZONE_NY_END       = 17;
// Trade only when institutions are active
// Avoid low liquidity = avoid being the liquidity

input group "=== NEWS BLACKOUT (Avoid Macro Noise) ==="
input bool   BLOCK_NFP         = true;
input bool   BLOCK_FOMC        = true;
input bool   BLOCK_MON_AM      = true;
input bool   BLOCK_FRI_PM      = true;
// Macro news = unpredictable variance
// Van Tharp: "Trade the system, not the prediction"

input group "=== TIERED TRAILING (Let Winners Run) ==="
input bool   USE_TIERED_TRAILING  = true;
input double TRAIL_T1_TRIGGER_PIPS = 50.0;    // @ +1R
input double TRAIL_T1_BUFFER_PIPS  = 30.0;    // Lock +0.6R
input double TRAIL_T2_TRIGGER_PIPS = 80.0;    // @ +1.6R
input double TRAIL_T2_BUFFER_PIPS  = 50.0;    // Lock +1.0R
// T1: Breakeven + 30 pips protected
// T2: Breakeven + 50 pips protected
// TP @ +2R: Full target or let run if momentum continues

input group "=== NOTIFICATIONS ==="
input bool   PUSH_ON           = true;
input bool   ALERT_ON          = true;

input group "=== DEBUG ==="
input bool   DEBUG_MODE        = true;
input bool   SCAN_EVERY_TICK   = true;

//+------------------------------------------------------------------+
#define MAX_PAIRS 15
#define EA_MAGIC  20250801

enum EPhase { PHASE_SCAN, PHASE_ENTRY, PHASE_EXPIRED };
enum EStructType { STRUCT_BOS, STRUCT_CHOCH };

struct SPair { string sym; bool on; };

struct SState {
   EPhase      phase;
   bool        is_buy;
   EStructType struct_type;
   double      struct_level;
   double      disp_high,disp_low,disp_open,disp_close;
   datetime    disp_time;
   double      fvg_h4_high,fvg_h4_low,fvg_h4_mid;
   double      entry_price,sl_price,tp_price;
   datetime    last_h4_bar,last_scan_time;
   datetime    phase_start,last_loss_time;
   double      atr_h4,d1_body_ratio;
   int         d1_bias_direction;
   string      quote_currency;
   datetime    entry_time;
   bool        t1_activated;
   bool        t2_activated;
   double      initial_risk_pips;  // Van Tharp: track R-multiple
};

struct SHandle {
   int atr_h4,atr_d1,rsi_h4,ema200_d1;
};

SPair    gP[MAX_PAIRS];
SState   gS[MAX_PAIRS];
SHandle  gH[MAX_PAIRS];
int      gN=0;
datetime gLastDay=0;
CTrade   TR;
string   gCSV="SS_v964_signals.csv";
string   gCSV_out="SS_v964_outcomes.csv";
bool     gCSVHdr=false;
bool     gCSVOutHdr=false;
string   gQuoteTradedToday[10];
int      gQuoteCount=0;

//+------------------------------------------------------------------+
//| METRICS TRACKING FOR PHASE EXPANSION                               |
//+------------------------------------------------------------------+
struct SMetrics {
   int    total_trades;
   int    win_count;
   int    loss_count;
   int    be_count;
   double total_r;
   double max_r;
   int    current_consec_loss;
   int    max_consec_loss;
   datetime first_trade_time;
   datetime last_trade_time;
};

SMetrics gMetrics;

void InitMetrics(){
   gMetrics.total_trades=0;
   gMetrics.win_count=0;
   gMetrics.loss_count=0;
   gMetrics.be_count=0;
   gMetrics.total_r=0;
   gMetrics.max_r=0;
   gMetrics.current_consec_loss=0;
   gMetrics.max_consec_loss=0;
   gMetrics.first_trade_time=0;
   gMetrics.last_trade_time=0;
}

//+------------------------------------------------------------------+
//| Helper Functions                                                   |
//+------------------------------------------------------------------+
void AddPair(string sym,bool on){
   if(!on||gN>=MAX_PAIRS) return;
   gP[gN].sym=sym; gP[gN].on=true; gN++;
}

double GetPipSize(string sym){
   double point = SymbolInfoDouble(sym, SYMBOL_POINT);
   int digits = (int)SymbolInfoInteger(sym, SYMBOL_DIGITS);
   if(digits>=3) return point*10;
   return point*10;
}

string GetQuoteCurrency(string sym){
   string base=sym;
   int micro_pos=StringFind(sym,"micro");
   if(micro_pos>0) base=StringSubstr(sym,0,micro_pos);
   int len=StringLen(base);
   if(len>=6) return StringSubstr(base,len-3,3);
   return "USD";
}

bool QuoteCurrencyFree(string sym){
   string qc=GetQuoteCurrency(sym);
   for(int j=0;j<gQuoteCount;j++){
      if(gQuoteTradedToday[j]==qc){
         if(DEBUG_MODE) Print("[QC][",sym,"] ",qc," locked");
         return false;
      }
   }
   return true;
}

int GetPairIndex(string sym){
   for(int i=0;i<gN;i++) if(gP[i].sym==sym) return i;
   return -1;
}

void UnlockQuoteCurrency(string sym){
   string qc=GetQuoteCurrency(sym);
   for(int j=0;j<gQuoteCount;j++){
      if(gQuoteTradedToday[j]==qc){
         for(int k=j;k<gQuoteCount-1;k++) gQuoteTradedToday[k]=gQuoteTradedToday[k+1];
         gQuoteCount--; gQuoteTradedToday[gQuoteCount]="";
         return;
      }
   }
}

void LockQuoteCurrency(string sym){
   string qc=GetQuoteCurrency(sym);
   for(int j=0;j<gQuoteCount;j++) if(gQuoteTradedToday[j]==qc) return;
   if(gQuoteCount<10){ gQuoteTradedToday[gQuoteCount]=qc; gQuoteCount++; }
}

int CountOpenPositions(){
   int count=0;
   for(int p=0;p<PositionsTotal();p++){
      ulong tk=PositionGetTicket(p);
      if(!PositionSelectByTicket(tk)) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=EA_MAGIC) continue;
      count++;
   }
   return count;
}

bool MaxTradesReached(){
   int current=CountOpenPositions();
   bool reached=current>=MAX_TRADES;
   if(reached && DEBUG_MODE) Print("[MAX_TRADES] ",current,"/",MAX_TRADES," reached");
   return reached;
}

//+------------------------------------------------------------------+
//| D1 Bias: 3-Candle Confirmation (Probability Tilt)                  |
//+------------------------------------------------------------------+
int GetD1Bias(int i){
   string s=gP[i].sym;
   double C[],O[],H[],L[];
   ArraySetAsSeries(C,true); ArraySetAsSeries(O,true);
   ArraySetAsSeries(H,true); ArraySetAsSeries(L,true);

   if(CopyClose(s,PERIOD_D1,1,3,C)<3) return 0;
   if(CopyOpen(s,PERIOD_D1,1,3,O)<3) return 0;
   if(CopyHigh(s,PERIOD_D1,1,3,H)<3) return 0;
   if(CopyLow(s,PERIOD_D1,1,3,L)<3) return 0;

   int bullish=0, bearish=0;
   double total_body=0, total_range=0;

   for(int k=0;k<3;k++){
      double body=MathAbs(C[k]-O[k]);
      double range=H[k]-L[k];
      total_body+=body; total_range+=range;
      if(C[k]>O[k]) bullish++; else if(C[k]<O[k]) bearish++;
   }

   if(total_range<=0) return 0;
   gS[i].d1_body_ratio=total_body/total_range;

   if(gS[i].d1_body_ratio<MIN_D1_BODY_RATIO){
      gS[i].d1_bias_direction=0;
      if(DEBUG_MODE) Print("[D1][",s,"] Body ratio too low → NEUTRAL");
      return 0;
   }

   int bias=(bullish>=2)?1:(bearish>=2)?-1:0;
   gS[i].d1_bias_direction=bias;

   if(DEBUG_MODE) Print("[D1][",s,"] B:",bullish," Br:",bearish,
         " Ratio:",DoubleToString(gS[i].d1_body_ratio,2)," ",
         (bias>0)?"BULLISH":(bias<0)?"BEARISH":"NEUTRAL");
   return bias;
}

//+------------------------------------------------------------------+
//| Van Tharp: Fixed R-Multiple SL/TP                                  |
//| 1R = FIXED_SL_PIPS | Target = FIXED_TP_PIPS                       |
//+------------------------------------------------------------------+
double CalcSL(int i, bool is_buy, double entry){
   string s=gP[i].sym;
   double pip=GetPipSize(s);
   int digits=(int)SymbolInfoInteger(s,SYMBOL_DIGITS);

   double sl_dist=FIXED_SL_PIPS*pip;
   double sl=is_buy?(entry-sl_dist):(entry+sl_dist);
   sl=NormalizeDouble(sl,digits);

   gS[i].initial_risk_pips=FIXED_SL_PIPS;

   if(DEBUG_MODE) Print("[SL][",s,"] 1R=",DoubleToString(FIXED_SL_PIPS,0),
         "pips | Entry:",DoubleToString(entry,digits),
         " | SL:",DoubleToString(sl,digits));
   return sl;
}

double CalcTP(int i, bool is_buy, double entry){
   string s=gP[i].sym;
   double pip=GetPipSize(s);
   int digits=(int)SymbolInfoInteger(s,SYMBOL_DIGITS);

   double tp_dist=FIXED_TP_PIPS*pip;
   double tp=is_buy?(entry+tp_dist):(entry-tp_dist);
   tp=NormalizeDouble(tp,digits);

   if(DEBUG_MODE) Print("[TP][",s,"] +2R=",DoubleToString(FIXED_TP_PIPS,0),
         "pips | Entry:",DoubleToString(entry,digits),
         " | TP:",DoubleToString(tp,digits));
   return tp;
}

//+------------------------------------------------------------------+
//| Van Tharp: Position Sizing based on % Risk                         |
//| Lot = (Account × Risk%) ÷ (SL_pips × PipValue)                    |
//+------------------------------------------------------------------+
double CalcLotSize(int i, double entry, double sl){
   string s=gP[i].sym;
   double pip=GetPipSize(s);
   double tick_size=SymbolInfoDouble(s,SYMBOL_TRADE_TICK_SIZE);
   double tick_value=SymbolInfoDouble(s,SYMBOL_TRADE_TICK_VALUE);
   double lot_step=SymbolInfoDouble(s,SYMBOL_VOLUME_STEP);
   double min_lot=SymbolInfoDouble(s,SYMBOL_VOLUME_MIN);
   double max_lot=SymbolInfoDouble(s,SYMBOL_VOLUME_MAX);

   if(tick_size<=0 || tick_value<=0){
      Print("[LOT][",s,"] ERROR: Invalid tick size/value");
      return 0;
   }

   double account=AccountInfoDouble(ACCOUNT_BALANCE);
   double risk_amount=account*(RISK_PER_TRADE_PCT/100.0);
   double sl_distance=MathAbs(entry-sl);
   double ticks_at_risk=sl_distance/tick_size;
   double risk_per_lot=ticks_at_risk*tick_value;

   if(risk_per_lot<=0){
      Print("[LOT][",s,"] ERROR: Risk per lot <= 0");
      return 0;
   }

   double lot=risk_amount/risk_per_lot;
   lot=MathFloor(NormalizeDouble(lot/lot_step,8))*lot_step;
   lot=NormalizeDouble(lot,2);

   if(lot<min_lot) lot=min_lot;
   if(lot>max_lot) lot=max_lot;

   double actual_risk=lot*risk_per_lot;
   double actual_risk_pct=(actual_risk/account)*100.0;

   Print("[LOT][",s,"] Account:$",DoubleToString(account,2),
         " | Risk:",DoubleToString(RISK_PER_TRADE_PCT,1),"%=$",DoubleToString(risk_amount,2),
         " | SL:",DoubleToString(FIXED_SL_PIPS,0),"pips",
         " | Lot:",DoubleToString(lot,2),
         " | Actual Risk:",DoubleToString(actual_risk_pct,2),"%");

   return lot;
}

void RestoreTrailingState(){
   for(int p=0;p<PositionsTotal();p++){
      ulong tk=PositionGetTicket(p);
      if(!PositionSelectByTicket(tk)) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=EA_MAGIC) continue;
      string sym=PositionGetString(POSITION_SYMBOL);
      int idx=GetPairIndex(sym);
      if(idx<0) continue;

      gS[idx].entry_price=PositionGetDouble(POSITION_PRICE_OPEN);
      gS[idx].sl_price=PositionGetDouble(POSITION_SL);
      gS[idx].is_buy=(PositionGetInteger(POSITION_TYPE)==POSITION_TYPE_BUY);
      gS[idx].phase=PHASE_ENTRY;
      gS[idx].initial_risk_pips=FIXED_SL_PIPS;

      LockQuoteCurrency(sym);
      Print("[RESTORE][",sym,"] Entry:",DoubleToString(gS[idx].entry_price,5),
            " SL:",DoubleToString(gS[idx].sl_price,5));
   }
}

int OnInit(){
   gN=0;
   AddPair(SYM_EURUSD, SCAN_EURUSD);
   AddPair(SYM_AUDUSD, SCAN_AUDUSD);
   AddPair(SYM_USDCAD, SCAN_USDCAD);
   AddPair(SYM_USDCHF, SCAN_USDCHF);      // [NEW] Low volatility, safe haven
   AddPair(SYM_EURGBP, SCAN_EURGBP);      // [NEW] Cross pair, very low vol
   AddPair(SYM_NZDUSD, SCAN_NZDUSD);      // [NEW] Commodity-linked, steady

   if(gN==0){Alert("No pairs selected!"); return INIT_FAILED;}

   for(int i=0;i<gN;i++){
      string s=gP[i].sym;
      if(!SymbolSelect(s,true)){gP[i].on=false; continue;}
      gH[i].atr_h4=iATR(s,PERIOD_H4,14);
      gH[i].atr_d1=iATR(s,PERIOD_D1,14);
      gH[i].rsi_h4=iRSI(s,PERIOD_H4,14,PRICE_CLOSE);
      gH[i].ema200_d1=iMA(s,PERIOD_D1,200,0,MODE_EMA,PRICE_CLOSE);
      bool bad=(gH[i].atr_h4==INVALID_HANDLE||gH[i].atr_d1==INVALID_HANDLE||
                gH[i].rsi_h4==INVALID_HANDLE||gH[i].ema200_d1==INVALID_HANDLE);
      if(bad){Print("Init failed: ",s); gP[i].on=false; continue;}
      ResetState(i);
   }

   TR.SetExpertMagicNumber(EA_MAGIC);
   TR.SetDeviationInPoints(30);
   TR.SetTypeFilling(ORDER_FILLING_IOC);
   RestoreTrailingState();
   InitMetrics();

   string msg=StringFormat(
      "=== SmartSoldiers v9.64 | Van Tharp + SMC ===\n"
      "Risk: %.1f%%/trade | 1R=%.0fpips | +2R=%.0fpips\n"
      "Trail T1: +%.0fR→lock %.0fpips | T2: +%.0fR→lock %.0fpips\n"
      "Max Trades: %d | Cooldown: %dh | DD Limit: %.1f%%\n"
      "\"Entry is probability. Exit is profit.\"",
      RISK_PER_TRADE_PCT, FIXED_SL_PIPS, FIXED_TP_PIPS,
      TRAIL_T1_TRIGGER_PIPS, TRAIL_T1_BUFFER_PIPS,
      TRAIL_T2_TRIGGER_PIPS, TRAIL_T2_BUFFER_PIPS,
      MAX_TRADES, COOLDOWN_HOURS, MAX_DD_PCT);
   Print(msg);
   if(ALERT_ON) Alert(msg);
   return INIT_SUCCEEDED;
}

void OnDeinit(const int r){
   for(int i=0;i<gN;i++){
      IndicatorRelease(gH[i].atr_h4);
      IndicatorRelease(gH[i].atr_d1);
      IndicatorRelease(gH[i].rsi_h4);
      IndicatorRelease(gH[i].ema200_d1);
   }
}

void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &req,
                        const MqlTradeResult &res){
   if(trans.type!=TRADE_TRANSACTION_DEAL_ADD) return;
   ulong tk=trans.deal;
   if(tk==0) return;
   if(!HistorySelect(0,TimeCurrent())) return;
   if(!HistoryDealSelect(tk)) return;
   if(HistoryDealGetInteger(tk,DEAL_ENTRY)!=DEAL_ENTRY_OUT) return;

   long reason=HistoryDealGetInteger(tk,DEAL_REASON);
   string sym=HistoryDealGetString(tk,DEAL_SYMBOL);
   double profit=HistoryDealGetDouble(tk,DEAL_PROFIT);
   double price_out=HistoryDealGetDouble(tk,DEAL_PRICE);

   string exit_type="UNKNOWN";
   if(reason==DEAL_REASON_SL) exit_type="SL";
   if(reason==DEAL_REASON_TP) exit_type="TP";

   //+------------------------------------------------------------------+
   //| STEP 1: Calculate R-multiple FIRST (before metrics)                |
   //+------------------------------------------------------------------+
   int idx=GetPairIndex(sym);
   double r_multiple=0;

   if(idx>=0 && gS[idx].initial_risk_pips>0){
      double pip=GetPipSize(sym);
      double profit_pips=(price_out-gS[idx].entry_price)/pip*(gS[idx].is_buy?1:-1);
      r_multiple=profit_pips/gS[idx].initial_risk_pips;
   }

   //+------------------------------------------------------------------+
   //| STEP 2: Update metrics with calculated r_multiple                  |
   //+------------------------------------------------------------------+
   gMetrics.total_trades++;
   gMetrics.last_trade_time=TimeCurrent();
   if(gMetrics.first_trade_time==0) gMetrics.first_trade_time=TimeCurrent();

   if(r_multiple>0){
      gMetrics.win_count++;
      gMetrics.current_consec_loss=0;
   } else if(r_multiple<0){
      gMetrics.loss_count++;
      gMetrics.current_consec_loss++;
      if(gMetrics.current_consec_loss>gMetrics.max_consec_loss)
         gMetrics.max_consec_loss=gMetrics.current_consec_loss;
   } else {
      gMetrics.be_count++;
      gMetrics.current_consec_loss=0;
   }

   gMetrics.total_r+=r_multiple;
   if(r_multiple>gMetrics.max_r) gMetrics.max_r=r_multiple;

   // Console print every 5 trades
   if(gMetrics.total_trades%5==0){
      double expectancy=(gMetrics.total_trades>0)?gMetrics.total_r/gMetrics.total_trades:0;
      double win_rate=(gMetrics.total_trades>0)?(double)gMetrics.win_count/gMetrics.total_trades*100.0:0;
      Print("[METRICS] Trades:",gMetrics.total_trades,
            " | Wins:",gMetrics.win_count," | Losses:",gMetrics.loss_count,
            " | BE:",gMetrics.be_count,
            " | WinRate:",DoubleToString(win_rate,1),"%",
            " | Expectancy:",DoubleToString(expectancy,3),"R",
            " | MaxR:",DoubleToString(gMetrics.max_r,2),
            " | MaxConsecLoss:",gMetrics.max_consec_loss);
   }

   //+------------------------------------------------------------------+
   //| STEP 3: Handle trade outcome                                       |
   //+------------------------------------------------------------------+
   if(reason==DEAL_REASON_SL && profit<0){
      if(idx>=0) gS[idx].last_loss_time=TimeCurrent();
   }

   WriteOutcome(sym,tk,exit_type,profit,r_multiple,price_out);

   bool still_open=false;
   for(int p=0;p<PositionsTotal();p++){
      ulong ptk=PositionGetTicket(p);
      if(!PositionSelectByTicket(ptk)) continue;
      if(PositionGetInteger(POSITION_MAGIC)==EA_MAGIC && PositionGetString(POSITION_SYMBOL)==sym)
         {still_open=true; break;}
   }

   if(!still_open && idx>=0){
      ResetState(idx);
      UnlockQuoteCurrency(sym);
      Print("[",sym,"] Position closed → State reset | R:",DoubleToString(r_multiple,2));
   }
}

void WriteOutcome(string sym,ulong ticket,string exit_type,
                  double profit,double r_multiple,double price_out){
   int h=FileOpen(gCSV_out,FILE_WRITE|FILE_READ|FILE_CSV|FILE_COMMON,',');
   if(h==INVALID_HANDLE) h=FileOpen(gCSV_out,FILE_WRITE|FILE_READ|FILE_CSV,',');
   if(h==INVALID_HANDLE) return;
   if(!gCSVOutHdr||FileSize(h)==0){
      FileWrite(h,"time","symbol","ticket","exit_type","profit_usd","r_multiple","price_out");
      gCSVOutHdr=true;
   }
   FileSeek(h,0,SEEK_END);
   FileWrite(h,TimeToString(TimeCurrent(),TIME_DATE|TIME_SECONDS),sym,
      IntegerToString(ticket),exit_type,DoubleToString(profit,2),
      DoubleToString(r_multiple,2),DoubleToString(price_out,5));
   FileClose(h);
}

double GetATR(int i){
   string s=gP[i].sym;
   double buf[]; ArraySetAsSeries(buf,true);
   if(CopyBuffer(gH[i].atr_h4,0,1,1,buf)>=1) return buf[0];
   return 0;
}

//+------------------------------------------------------------------+
//| Console Command Handler for Real-Time Control                      |
//| Commands:                                                          |
//|   "status"  → Print current metrics                                |
//|   "expand"  → Check if expansion criteria met                        |
//|   "reset"   → Reset metrics (careful!)                             |
//+------------------------------------------------------------------+
void CheckConsoleCommands(){
   // Check for chart objects or use global variables for control
   // For now, use Print-based monitoring
}

void PrintStatus(){
   if(gMetrics.total_trades==0){
      Print("[STATUS] No trades yet. Start trading to collect metrics.");
      return;
   }

   double expectancy=(gMetrics.total_trades>0)?gMetrics.total_r/gMetrics.total_trades:0;
   double win_rate=(double)gMetrics.win_count/gMetrics.total_trades*100.0;
   int days_trading=(int)((TimeCurrent()-gMetrics.first_trade_time)/86400);

   Print("\n══════════ SMARTSOLDIERS STATUS ══════════");
   Print("Trading Days: ",days_trading," | Total Trades: ",gMetrics.total_trades);
   Print("Wins: ",gMetrics.win_count," | Losses: ",gMetrics.loss_count," | BE: ",gMetrics.be_count);
   Print("Win Rate: ",DoubleToString(win_rate,1),"%");
   Print("Expectancy: ",DoubleToString(expectancy,3),"R per trade");
   Print("Total R: ",DoubleToString(gMetrics.total_r,2)," | Max R: ",DoubleToString(gMetrics.max_r,2));
   Print("Max Consec Losses: ",gMetrics.max_consec_loss," | Current Streak: ",gMetrics.current_consec_loss);
   Print("Max Trades Setting: ",MAX_TRADES," | Auto-Expand: ",ENABLE_AUTO_EXPAND?"ON":"OFF");

   // Expansion readiness check
   if(MAX_TRADES<2){
      bool enough_trades=gMetrics.total_trades>=MIN_TRADES_FOR_EXPAND;
      bool good_expectancy=expectancy>=MIN_EXPECTANCY_EXPAND;
      bool safe_consec=gMetrics.max_consec_loss<=MAX_CONSEC_LOSS_EXPAND;
      bool enough_days=days_trading>=14;

      Print("\n─── EXPANSION READINESS (Phase 2: 2 trades) ───");
      Print(enough_days?"✅ 2+ weeks data":"⏳ Need 2+ weeks (",days_trading,"/14)",
            " | ",enough_trades?"✅ ":"❌ ",gMetrics.total_trades,"/",MIN_TRADES_FOR_EXPAND," trades");
      Print(good_expectancy?"✅ Expectancy good":"❌ Expectancy low",
            " (",DoubleToString(expectancy,3),"R / ",DoubleToString(MIN_EXPECTANCY_EXPAND,2),"R min)");
      Print(safe_consec?"✅ Consec loss safe":"❌ Consec loss high",
            " (",gMetrics.max_consec_loss,"/",MAX_CONSEC_LOSS_EXPAND," max)");

      if(enough_days && enough_trades && good_expectancy && safe_consec){
         Print("\n🚀 READY FOR EXPANSION! Change MAX_TRADES to 2 in inputs.");
         if(ENABLE_AUTO_EXPAND){
            Print("⚠️ Auto-expand enabled but MAX_TRADES still ",MAX_TRADES,". Manual input change required.");
         }
      } else {
         Print("\n⏳ NOT READY for expansion. Keep collecting data.");
      }
   }
   Print("══════════════════════════════════════════\n");
}

void OnTick(){
   ResetDay();

   // Print status every 4 hours
   static datetime last_status=0;
   if(TimeCurrent()-last_status>=14400){
      last_status=TimeCurrent();
      PrintStatus();
   }

   if(MaxTradesReached()) return;
   if(DDHit()) return;
   if(USE_TIERED_TRAILING) UpdateTieredTrailing();

   for(int i=0;i<gN;i++){
      if(!gP[i].on) continue;
      if(gS[i].last_loss_time>0 &&
         (TimeCurrent()-gS[i].last_loss_time)<(long)COOLDOWN_HOURS*3600) continue;
      if(NewsBlock()) continue;

      string s=gP[i].sym;
      datetime h4b=iTime(s,PERIOD_H4,0);
      bool nh4=(h4b!=gS[i].last_h4_bar);
      if(nh4) gS[i].last_h4_bar=h4b;

      bool should_scan=SCAN_EVERY_TICK?true:nh4;

      switch(gS[i].phase){
         case PHASE_SCAN:
            if(should_scan && TimeCurrent()-gS[i].last_scan_time>=900){
               gS[i].last_scan_time=TimeCurrent();
               PhaseScan(i);
            }
            break;
         case PHASE_ENTRY: PhaseEntry(i); break;
         case PHASE_EXPIRED: ResetState(i); break;
      }
   }
}

//+------------------------------------------------------------------+
//| SMC PhaseScan: Structure + Displacement + FVG                      |
//| Entry = probability tilt, bukan prediksi                          |
//+------------------------------------------------------------------+
void PhaseScan(int i){
   string s=gP[i].sym;
   double atr_h4=GetATR(i);
   if(atr_h4<=0){if(DEBUG_MODE)Print("[SCAN][",s,"] ATR invalid"); return;}
   if(gS[i].phase==PHASE_ENTRY) return;

   int d1_bias=GetD1Bias(i);
   string d1_str=(d1_bias>0)?"BULL":(d1_bias<0)?"BEAR":"NEUTRAL";

   if(USE_D1_BIAS_FILTER && d1_bias==0){
      if(DEBUG_MODE) Print("[SCAN][",s,"] D1 NEUTRAL → skip");
      return;
   }

   int bars=STRUCT_LOOKBACK+STRUCT_CONFIRM+5;
   double H[],L[],C[],O[];
   ArraySetAsSeries(H,true); ArraySetAsSeries(L,true);
   ArraySetAsSeries(C,true); ArraySetAsSeries(O,true);
   if(CopyHigh(s,PERIOD_H4,1,bars,H)<bars) return;
   if(CopyLow(s,PERIOD_H4,1,bars,L)<bars) return;
   if(CopyClose(s,PERIOD_H4,1,bars,C)<bars) return;
   if(CopyOpen(s,PERIOD_H4,1,bars,O)<bars) return;

   // Scan for BULLISH setup
   for(int b=STRUCT_CONFIRM; b<STRUCT_LOOKBACK; b++){
      bool is_swing_high=true;
      for(int k=1; k<=STRUCT_CONFIRM && (b-k)>=0; k++)
         if(H[b]<=H[b-k]){is_swing_high=false; break;}
      if(is_swing_high)
         for(int k=1; k<=STRUCT_CONFIRM; k++)
            if(H[b]<=H[b+k]){is_swing_high=false; break;}

      if(!is_swing_high) continue;

      for(int d=0; d<b; d++){
         double body=MathAbs(C[d]-O[d]);
         if(body<atr_h4*DISP_MIN_BODY_ATR) continue;

         if(C[d]>H[b] && C[d]>O[d]){
            if(USE_D1_BIAS_FILTER && d1_bias<=0) continue;

            double swing_low=L[b];
            for(int k=b+1; k<MathMin(b+5,bars); k++)
               if(L[k]<swing_low) swing_low=L[k];

            double pip=GetPipSize(s);
            double entry_est=SymbolInfoDouble(s,SYMBOL_ASK);
            double struct_dist=MathAbs(entry_est-swing_low)/pip;

            if(struct_dist>FIXED_SL_PIPS){
               if(DEBUG_MODE) Print("[SCAN][",s,"] Struct dist ",
                     DoubleToString(struct_dist,1)," > ",DoubleToString(FIXED_SL_PIPS,0)," → skip");
               continue;
            }

            double fhi=0,flo=0;
            bool fvg=FindFVG(H,L,C,d,true,atr_h4,fhi,flo,bars);
            if(!fvg && REQUIRE_FVG) continue;
            if(!fvg){fhi=C[d]; flo=L[d];}

            if(!QuoteCurrencyFree(s)) return;

            LockQuoteCurrency(s);
            SaveState(i,true,STRUCT_BOS,swing_low,
               H[d],L[d],O[d],C[d],iTime(s,PERIOD_H4,d+1),fhi,flo,atr_h4);
            Print("[",s,"] ✅ BULL SETUP (D1:",d1_str,") Struct:",DoubleToString(swing_low,5));
            return;
         }
      }
   }

   // Scan for BEARISH setup
   for(int b=STRUCT_CONFIRM; b<STRUCT_LOOKBACK; b++){
      bool is_swing_low=true;
      for(int k=1; k<=STRUCT_CONFIRM && (b-k)>=0; k++)
         if(L[b]>=L[b-k]){is_swing_low=false; break;}
      if(is_swing_low)
         for(int k=1; k<=STRUCT_CONFIRM; k++)
            if(L[b]>=L[b+k]){is_swing_low=false; break;}

      if(!is_swing_low) continue;

      for(int d=0; d<b; d++){
         double body=MathAbs(C[d]-O[d]);
         if(body<atr_h4*DISP_MIN_BODY_ATR) continue;

         if(C[d]<L[b] && C[d]<O[d]){
            if(USE_D1_BIAS_FILTER && d1_bias>=0) continue;

            double swing_high=H[b];
            for(int k=b+1; k<MathMin(b+5,bars); k++)
               if(H[k]>swing_high) swing_high=H[k];

            double pip=GetPipSize(s);
            double entry_est=SymbolInfoDouble(s,SYMBOL_BID);
            double struct_dist=MathAbs(entry_est-swing_high)/pip;

            if(struct_dist>FIXED_SL_PIPS){
               if(DEBUG_MODE) Print("[SCAN][",s,"] Struct dist ",
                     DoubleToString(struct_dist,1)," > ",DoubleToString(FIXED_SL_PIPS,0)," → skip");
               continue;
            }

            double fhi=0,flo=0;
            bool fvg=FindFVG(H,L,C,d,false,atr_h4,fhi,flo,bars);
            if(!fvg && REQUIRE_FVG) continue;
            if(!fvg){fhi=H[d]; flo=C[d];}

            if(!QuoteCurrencyFree(s)) return;

            LockQuoteCurrency(s);
            SaveState(i,false,STRUCT_BOS,swing_high,
               H[d],L[d],O[d],C[d],iTime(s,PERIOD_H4,d+1),fhi,flo,atr_h4);
            Print("[",s,"] ✅ BEAR SETUP (D1:",d1_str,") Struct:",DoubleToString(swing_high,5));
            return;
         }
      }
   }

   if(DEBUG_MODE) Print("[SCAN][",s,"] No valid setup (D1:",d1_str,")");
}

bool FindFVG(double &H[],double &L[],double &C[],int didx,bool bull,
             double atr,double &fhi,double &flo,int maxb){
   for(int offset=-1; offset<=1; offset++){
      int b=didx+offset;
      if(b<2 || b>=maxb-2) continue;
      if(bull){
         double g=L[b-1]-H[b+1];
         if(g>0 && g>=atr*DISP_FVG_MIN_ATR){fhi=L[b-1]; flo=H[b+1]; return true;}
      } else {
         double g=L[b+1]-H[b-1];
         if(g>0 && g>=atr*DISP_FVG_MIN_ATR){fhi=L[b+1]; flo=H[b-1]; return true;}
      }
   }
   return false;
}

void SaveState(int i,bool bull,EStructType stype,double slevel,
               double dh,double dl,double dop,double dcl,
               datetime dtime,double fhi,double flo,double atr){
   gS[i].is_buy=bull; gS[i].struct_type=stype; gS[i].struct_level=slevel;
   gS[i].disp_high=dh; gS[i].disp_low=dl; gS[i].disp_open=dop; gS[i].disp_close=dcl;
   gS[i].disp_time=dtime;
   gS[i].fvg_h4_high=fhi; gS[i].fvg_h4_low=flo; gS[i].fvg_h4_mid=(fhi+flo)*0.5;
   gS[i].phase_start=TimeCurrent(); gS[i].atr_h4=atr; gS[i].phase=PHASE_ENTRY;
   gS[i].quote_currency=GetQuoteCurrency(gP[i].sym);
   gS[i].t1_activated=false; gS[i].t2_activated=false;
   gS[i].initial_risk_pips=FIXED_SL_PIPS;
}

//+------------------------------------------------------------------+
//| PhaseEntry: Execute with Van Tharp Discipline                        |
//+------------------------------------------------------------------+
void PhaseEntry(int i){
   string s=gP[i].sym;

   MqlDateTime dt; TimeToStruct(TimeGMT(),dt);
   int hour=dt.hour;
   bool in_london=(hour>=KILLZONE_LONDON_START && hour<KILLZONE_LONDON_END);
   bool in_ny=(hour>=KILLZONE_NY_START && hour<KILLZONE_NY_END);

   if(!in_london && !in_ny){
      if(DEBUG_MODE) Print("[ENTRY][",s,"] Outside killzone (",hour," GMT) → skip");
      ResetState(i); return;
   }

   int d1_bias=GetD1Bias(i);
   if(USE_D1_BIAS_FILTER){
      if(d1_bias==0){Print("[",s,"] D1 NEUTRAL → cancel"); ResetState(i); return;}
      if(gS[i].is_buy && d1_bias<0){Print("[",s,"] BUY vs D1 BEAR → cancel"); ResetState(i); return;}
      if(!gS[i].is_buy && d1_bias>0){Print("[",s,"] SELL vs D1 BULL → cancel"); ResetState(i); return;}
   }

   UnlockQuoteCurrency(s);
   if(!QuoteCurrencyFree(s)){Print("[",s,"] QC locked → skip"); ResetState(i); return;}

   double entry=gS[i].is_buy?SymbolInfoDouble(s,SYMBOL_ASK):SymbolInfoDouble(s,SYMBOL_BID);

   gS[i].sl_price=CalcSL(i,gS[i].is_buy,entry);
   gS[i].tp_price=CalcTP(i,gS[i].is_buy,entry);
   gS[i].entry_price=entry;
   gS[i].entry_time=TimeCurrent();

   double lot=CalcLotSize(i,entry,gS[i].sl_price);
   if(lot<=0){Print("[",s,"] Lot calculation failed → skip"); ResetState(i); return;}

   if(ExecuteTrade(i,entry,lot)){
      LockQuoteCurrency(s);
      SendSignal(i,entry,lot);
   } else {
      Print("[",s,"] ExecuteTrade FAILED");
      ResetState(i);
   }
}

//+------------------------------------------------------------------+
//| ExecuteTrade: Van Tharp R-Multiple Execution                       |
//+------------------------------------------------------------------+
bool ExecuteTrade(int i, double entry, double lot){
   string s=gP[i].sym;
   double pip=GetPipSize(s);
   int digits=(int)SymbolInfoInteger(s,SYMBOL_DIGITS);

   double sl=gS[i].sl_price;
   double tp=gS[i].tp_price;

   // Validate SL = 50 pips
   double sl_dist=MathAbs(sl-entry);
   double expected_sl=FIXED_SL_PIPS*pip;
   if(MathAbs(sl_dist-expected_sl)>pip){
      Print("[",s,"] ❌ SL VALIDATION FAILED! Expected:",DoubleToString(expected_sl,5),
            " Got:",DoubleToString(sl_dist,5));
      sl=gS[i].is_buy?(entry-expected_sl):(entry+expected_sl);
      sl=NormalizeDouble(sl,digits);
      gS[i].sl_price=sl;
   }

   // Validate TP = 100 pips
   double tp_dist=MathAbs(tp-entry);
   double expected_tp=FIXED_TP_PIPS*pip;
   if(MathAbs(tp_dist-expected_tp)>pip){
      Print("[",s,"] ❌ TP VALIDATION FAILED! Expected:",DoubleToString(expected_tp,5),
            " Got:",DoubleToString(tp_dist,5));
      tp=gS[i].is_buy?(entry+expected_tp):(entry-expected_tp);
      tp=NormalizeDouble(tp,digits);
      gS[i].tp_price=tp;
   }

   double rr=(sl_dist>0)?tp_dist/sl_dist:0;

   Print("[",s,"] 🔍 VALIDATED | Entry:",DoubleToString(entry,5),
         " | SL:",DoubleToString(sl,5)," (",DoubleToString(FIXED_SL_PIPS,0),"p)",
         " | TP:",DoubleToString(tp,5)," (",DoubleToString(FIXED_TP_PIPS,0),"p)",
         " | RR:1:",DoubleToString(rr,1)," | Lot:",DoubleToString(lot,2));

   bool success=gS[i].is_buy
      ?TR.Buy(lot,s,entry,sl,tp,"SS964_1R_2R")
      :TR.Sell(lot,s,entry,sl,tp,"SS964_1R_2R");

   if(success){
      Print("[",s,"] ✅ ORDER | Lot:",DoubleToString(lot,2),
            " | SL:",DoubleToString(FIXED_SL_PIPS,0),"p",
            " | TP:",DoubleToString(FIXED_TP_PIPS,0),"p");
   } else {
      Print("[",s,"] ❌ FAILED | Err:",TR.ResultRetcode()," ",TR.ResultRetcodeDescription());
   }
   return success;
}

void SendSignal(int i, double entry, double lot){
   string s=gP[i].sym;
   string dir=gS[i].is_buy?"BUY":"SELL";
   string d1_str=(gS[i].d1_bias_direction>0)?"BULL":(gS[i].d1_bias_direction<0)?"BEAR":"NEUT";

   double account=AccountInfoDouble(ACCOUNT_BALANCE);
   double risk_amt=account*(RISK_PER_TRADE_PCT/100.0);

   string msg=StringFormat(
      "══ %s %s [v9.64 VanTharp] ══\n"
      "D1: %s | Struct: %.5f\n"
      "Entry: %.5f | Lot: %.2f\n"
      "SL: %.5f (%.0fp | -1R)\n"
      "TP: %.5f (%.0fp | +2R)\n"
      "Risk: $%.2f (%.1f%%)\n"
      "\"Let winners run. Cut losers short.\"",
      dir,s,d1_str,gS[i].struct_level,
      entry,lot,
      gS[i].sl_price,FIXED_SL_PIPS,
      gS[i].tp_price,FIXED_TP_PIPS,
      risk_amt,RISK_PER_TRADE_PCT);
   Print(msg);
   if(PUSH_ON) SendNotification(msg);
   if(ALERT_ON) Alert(msg);
   WriteCSV(i,entry,lot);
}

void WriteCSV(int i, double entry, double lot){
   int h=FileOpen(gCSV,FILE_WRITE|FILE_READ|FILE_CSV|FILE_COMMON,',');
   if(h==INVALID_HANDLE) h=FileOpen(gCSV,FILE_WRITE|FILE_READ|FILE_CSV,',');
   if(h==INVALID_HANDLE) return;
   if(!gCSVHdr||FileSize(h)==0){
      FileWrite(h,"time","symbol","dir","entry","sl","tp","lot","risk_pct","r_target");
      gCSVHdr=true;
   }
   FileSeek(h,0,SEEK_END);
   FileWrite(h,TimeToString(TimeCurrent(),TIME_DATE|TIME_SECONDS),
      gP[i].sym,gS[i].is_buy?"BUY":"SELL",
      DoubleToString(entry,5),DoubleToString(gS[i].sl_price,5),
      DoubleToString(gS[i].tp_price,5),DoubleToString(lot,2),
      DoubleToString(RISK_PER_TRADE_PCT,1),
      DoubleToString(FIXED_TP_PIPS/FIXED_SL_PIPS,1));
   FileClose(h);
}

//+------------------------------------------------------------------+
//| UpdateTieredTrailing: Van Tharp "Let Winners Run"                  |
//| T1 @ +1R (50p): Lock +0.6R (30p) → Breakeven + 30 pips          |
//| T2 @ +1.6R (80p): Lock +1R (50p) → Breakeven + 50 pips          |
//| TP @ +2R (100p): Full target or momentum continues              |
//+------------------------------------------------------------------+
void UpdateTieredTrailing(){
   for(int p=PositionsTotal()-1; p>=0; p--){
      ulong tk=PositionGetTicket(p);
      if(!PositionSelectByTicket(tk)) continue;
      if(PositionGetInteger(POSITION_MAGIC)!=EA_MAGIC) continue;

      string sym=PositionGetString(POSITION_SYMBOL);
      long pt=PositionGetInteger(POSITION_TYPE);
      double entry=PositionGetDouble(POSITION_PRICE_OPEN);
      double csl=PositionGetDouble(POSITION_SL);
      double ctp=PositionGetDouble(POSITION_TP);

      int idx=GetPairIndex(sym);
      if(idx<0) continue;

      double pip=GetPipSize(sym);
      double current=(pt==POSITION_TYPE_BUY)?SymbolInfoDouble(sym,SYMBOL_BID):SymbolInfoDouble(sym,SYMBOL_ASK);

      double profit_pips=(pt==POSITION_TYPE_BUY)?(current-entry)/pip:(entry-current)/pip;

      // TIER 2: +1.6R (80 pips) → Lock +1R (50 pips)
      if(profit_pips>=TRAIL_T2_TRIGGER_PIPS && !gS[idx].t2_activated){
         double new_sl=(pt==POSITION_TYPE_BUY)?(entry+TRAIL_T2_BUFFER_PIPS*pip):(entry-TRAIL_T2_BUFFER_PIPS*pip);
         bool can_move=(pt==POSITION_TYPE_BUY)?(new_sl>entry&&(csl==0||new_sl>csl))
                                               :(new_sl<entry&&(csl==0||new_sl<csl));
         if(can_move && TR.PositionModify(tk,new_sl,ctp)){
            gS[idx].t2_activated=true; gS[idx].t1_activated=true;
            Print("[",sym,"] 🔒🔒 T2 | Profit:",DoubleToString(profit_pips,1),
                  "p | SL→",DoubleToString(new_sl,5)," | Locked:",DoubleToString(TRAIL_T2_BUFFER_PIPS,0),"p");
         }
      }
      // TIER 1: +1R (50 pips) → Lock +0.6R (30 pips)
      else if(profit_pips>=TRAIL_T1_TRIGGER_PIPS && !gS[idx].t1_activated && !gS[idx].t2_activated){
         double new_sl=(pt==POSITION_TYPE_BUY)?(entry+TRAIL_T1_BUFFER_PIPS*pip):(entry-TRAIL_T1_BUFFER_PIPS*pip);
         bool can_move=(pt==POSITION_TYPE_BUY)?(new_sl>entry&&(csl==0||new_sl>csl))
                                               :(new_sl<entry&&(csl==0||new_sl<csl));
         if(can_move && TR.PositionModify(tk,new_sl,ctp)){
            gS[idx].t1_activated=true;
            Print("[",sym,"] 🔒 T1 | Profit:",DoubleToString(profit_pips,1),
                  "p | SL→",DoubleToString(new_sl,5)," | Locked:",DoubleToString(TRAIL_T1_BUFFER_PIPS,0),"p");
         }
      }
   }
}

bool NewsBlock(){
   MqlDateTime dt; TimeToStruct(TimeGMT(),dt);
   int h=dt.hour, t=h*60+dt.min, dow=dt.day_of_week;
   if(BLOCK_NFP  && dow==5 && t>=(12*60+30) && t<=(15*60)) return true;
   if(BLOCK_FOMC && dow==3 && t>=(18*60) && t<=(21*60)) return true;
   if(BLOCK_MON_AM && dow==1 && h<10) return true;
   if(BLOCK_FRI_PM && dow==5 && h>=16) return true;
   if(dow==0||dow==6) return true;
   return false;
}

bool DDHit(){
   double b=AccountInfoDouble(ACCOUNT_BALANCE);
   double e=AccountInfoDouble(ACCOUNT_EQUITY);
   if(b<=0) return false;
   return ((b-e)/b*100.0)>=MAX_DD_PCT;
}

void ResetDay(){
   MqlDateTime dt; TimeToStruct(TimeCurrent(),dt);
   datetime today=StringToTime(StringFormat("%04d.%02d.%02d",dt.year,dt.mon,dt.day));
   if(today!=gLastDay){
      gLastDay=today; gQuoteCount=0;
      for(int j=0;j<10;j++) gQuoteTradedToday[j]="";
      Print("Daily reset.");
   }
}

void ResetState(int i){
   datetime preserved=gS[i].last_loss_time;
   gS[i].phase=PHASE_SCAN; gS[i].is_buy=false;
   gS[i].struct_level=0; gS[i].struct_type=STRUCT_BOS;
   gS[i].disp_high=gS[i].disp_low=gS[i].disp_open=gS[i].disp_close=0; gS[i].disp_time=0;
   gS[i].fvg_h4_high=gS[i].fvg_h4_low=gS[i].fvg_h4_mid=0;
   gS[i].entry_price=gS[i].sl_price=gS[i].tp_price=0;
   gS[i].phase_start=0; gS[i].atr_h4=0; gS[i].d1_body_ratio=0;
   gS[i].d1_bias_direction=0; gS[i].quote_currency=""; gS[i].entry_time=0;
   gS[i].t1_activated=false; gS[i].t2_activated=false; gS[i].initial_risk_pips=0;
   gS[i].last_loss_time=preserved;
}
//+------------------------------------------------------------------+
