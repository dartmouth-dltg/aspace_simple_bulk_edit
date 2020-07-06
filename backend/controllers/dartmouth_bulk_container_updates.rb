require 'aspace_logger'

class ArchivesSpaceService < Sinatra::Base
  
  Endpoint.post('/plugins/dartmouth_bulk_container_update/repositories/:repo_id/get_aos')
  .description("Return resolved JSON of the records to update")
  .params(["repo_id", :repo_id],
          ["uri", [String], "The uris of the records to update"])
  .permissions([:update_resource_record])
  .returns([200, "[(:dartmouth_bulk_container_update_item)]"]) \
  do
    bulk_updates = DartmouthBulkContainerUpdateItems.new(params[:uri])

    json_response(resolve_references(bulk_updates.dartmouth_bulk_container_update_items, ["archival_object","archival_object::_resolved::instances::sub_container::top_container"]))
  end

end