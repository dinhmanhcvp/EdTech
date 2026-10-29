import {ParentReportView} from '../../../components/hub/ParentReportView';

export const metadata = {title: 'Báo cáo tuần', robots: {index: false, follow: false}, referrer: 'no-referrer' as const};

export default function Page({params}: {params: {token: string}}) {
  return <ParentReportView token={decodeURIComponent(params.token)} />;
}
