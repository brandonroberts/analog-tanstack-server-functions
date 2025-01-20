import { eventHandler } from 'h3';
import invariant from 'tiny-invariant'
import serverManifest from 'tsr:server-fn-manifest';

export default eventHandler(async (event) => {
  const serverFnManifest: any = {
    'src_app_random-number_ts--randomNumberFn_createServerFn_handler': {
      importer: () => import('../../../app/random-number').then(m => m.randomNumberFn)
    }
  };

  const req = event.node.req || '';
  const [url] = (req.url || '')?.split('?');
  // console.log(serverManifest);

  const functionId = url.split('/').pop();
  invariant(functionId, 'No function ID provided');

  const fnInfo = serverFnManifest[functionId];
  invariant(fnInfo, `Server function ${functionId} not found`);

  // @ts-ignore
  const fnModule = await fnInfo.importer();
  invariant(fnModule, `Server function ${functionId} could not be imported`);

  const args = {} as any; //await req.json()

  const result = await fnModule();

  console.log({ result });
  return { result };
});