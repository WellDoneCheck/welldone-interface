import ExportSheet from '../../components/ExportSheet';

// Opening /export from within the site shows it as a sheet over the current page; loading /export directly shows the full page
export default function ExportSheetRoute() {
  return <ExportSheet />;
}
