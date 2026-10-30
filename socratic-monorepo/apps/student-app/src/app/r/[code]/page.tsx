import {RecapPage} from '../../../components/hub/RecapPage';

export default function Page({params}: {params: {code: string}}) {
  return <RecapPage code={decodeURIComponent(params.code)} />;
}
