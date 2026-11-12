import { Shell } from '@/components/Shell'
import { CreateRequest } from '@/components/CreateRequest'
import { Activity } from '@/components/Activity'
import { PayInvoice } from '@/components/PayInvoice'
import { usePayParam } from '@/lib/nav'

export default function App() {
  const [payId, go] = usePayParam()

  return (
    <Shell>
      {payId ? (
        <PayInvoice id={payId} onBack={() => go(null)} />
      ) : (
        <main>
          <CreateRequest onOpen={go} />
          <Activity onOpen={go} />
        </main>
      )}
    </Shell>
  )
}
