import SurveyMap from '../components/SurveyMap';

// The map and compare pages share one survey map, kept as it is when moving between them (see SurveyMap)
export default function SurveyLayout({ children }: { children: React.ReactNode }) {
  return <SurveyMap>{children}</SurveyMap>;
}
