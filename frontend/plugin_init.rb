require 'digest'

ArchivesSpace::Application.extend_aspace_routes(File.join(File.dirname(__FILE__), "routes.rb"))

# cache busting: version the plugin's css/js by content so the query string
# only changes when the files do (and is the same on every node)
AppConfig[:aspace_simple_bulk_edit_asset_version] =
  Digest::MD5.hexdigest(
    Dir[File.join(File.dirname(__FILE__), "assets", "*.{css,js}")].sort.map {|f| File.read(f)}.join
  )[0, 12]
