import Spend from "@/components/interfaces/Spend";
import { getConfig } from "@/components/lib/config";

export default async function Page() {
  return (
    <>
      <div>
        <Spend sundayWeekStart={getConfig().sundayWeekStart} />
      </div>
    </>
  );
}
