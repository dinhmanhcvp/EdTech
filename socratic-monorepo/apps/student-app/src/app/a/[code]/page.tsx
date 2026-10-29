import {AssignmentPage} from '../../../components/hub/AssignmentPage';

export default function Page({params}: {params: {code: string}}) {
  return <AssignmentPage code={decodeURIComponent(params.code)} />;
}
