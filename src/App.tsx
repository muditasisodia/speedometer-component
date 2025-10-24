import './App.css'
import SpeedometerV2 from './components/SpeedometerV2'

function App() {
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 16 }}>Speedometer Demos</h1>


      <h2 style={{ marginTop: 28, marginBottom: 16 }}>Speedometer V2 (Styled)</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Free • Static (54%)</div>
          <SpeedometerV2 startValue={0} endValue={54} type="free" perpetual={false} label="Your score" subLabel="" />
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Pro • Static (83%)</div>
          <SpeedometerV2 startValue={0} endValue={83} type="pro" perpetual={false} label="Most Pro users" subLabel="" />
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Free • Perpetual (30 ↔ 70)</div>
          <SpeedometerV2 startValue={30} endValue={70} type="free" perpetual={true} label="Your score" subLabel="" />
        </div>

        <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
          <div style={{ marginBottom: 8, fontWeight: 600 }}>Pro • Perpetual (30 ↔ 70)</div>
          <SpeedometerV2 startValue={30} endValue={70} type="pro" perpetual={true} label="Most Pro users" subLabel="" />
        </div>
      </div>
    </div>
  )
}

export default App
