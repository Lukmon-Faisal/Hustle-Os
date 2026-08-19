import { useState } from 'react'
import { useApp } from '../context/AppContext'

export function BusinessSetup() {
  const { t, setCustomBusiness, loadDemo } = useApp()
  const [name, setName] = useState('')
  const [type, setType] = useState('')
  const [location, setLocation] = useState('')
  const [years, setYears] = useState('')
  const [products, setProducts] = useState('')

  const canContinue = name.trim().length > 0 && type.trim().length > 0

  const submit = () => {
    if (!canContinue) return
    setCustomBusiness({
      name: name.trim(),
      type: type.trim(),
      location: location.trim() || 'Nigeria',
      yearsOperating: Number(years) || 0,
      mainProducts: products.split(',').map((p) => p.trim()).filter(Boolean),
    })
  }

  return (
    <div className="screen stack">
      <div className="progress-row">
        <span className="eyebrow">Step 2 of 2</span>
      </div>
      <div className="progress-track" style={{ marginBottom: 8 }}>
        <div className="progress-fill" style={{ width: '80%' }} />
      </div>
      <h1>{t('businessSetupTitle')}</h1>

      <div className="stack" style={{ marginTop: 8 }}>
        <div>
          <label className="field-label" htmlFor="bname">{t('businessName')}</label>
          <input id="bname" className="input-field" placeholder="e.g. Aisha's Kitchen" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="btype">{t('businessType')}</label>
          <input id="btype" className="input-field" placeholder="e.g. Food Vendor" value={type} onChange={(e) => setType(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="bloc">{t('location')}</label>
          <input id="bloc" className="input-field" placeholder="e.g. Lagos" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="byears">{t('yearsOperating')}</label>
          <input id="byears" type="number" min={0} className="input-field" placeholder="e.g. 2" value={years} onChange={(e) => setYears(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="bprod">{t('mainProducts')}</label>
          <input id="bprod" className="input-field" placeholder="e.g. Jollof Rice, Chicken, Drinks" value={products} onChange={(e) => setProducts(e.target.value)} />
        </div>
      </div>

      <div className="stack" style={{ marginTop: 12, gap: 10 }}>
        <button className="btn-primary" disabled={!canContinue} style={{ opacity: canContinue ? 1 : 0.5 }} onClick={submit}>
          {t('continueBtn')}
        </button>
        <button className="btn-ghost" onClick={loadDemo}>{t('continueDemo')}</button>
      </div>
    </div>
  )
}
