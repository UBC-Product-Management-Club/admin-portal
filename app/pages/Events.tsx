import type { BasicEvents } from '@/lib/types/Event';
import type { Route } from '../+types/root';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import { useEvents } from '@/hooks/useEvents';

export default function Events({ loaderData, actionData, params, matches }: Route.ComponentProps) {
  const [tabs, setTabs] = useState<BasicEvents | undefined>();
  const { getBasicEventInfo } = useEvents();

  useEffect(() => {
    getBasicEventInfo()
      .then(setTabs)
      .catch((e) => console.error(e));
  }, []);

  useEffect(() => {
    console.log(tabs);
  }, [tabs]);

  if (!tabs) {
    return <h1>loading...</h1>;
  }

  return (
    <div className="p-4">
      <Tabs defaultValue={tabs[0].event_id} className="">
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.event_id} value={tab.event_id} className="cursor-pointer">
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.event_id} value={tab.event_id}>
            {tab.name}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
