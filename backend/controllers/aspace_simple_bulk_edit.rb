require 'aspace_logger'

class ArchivesSpaceService < Sinatra::Base
    
  Endpoint.post('/plugins/aspace_simple_bulk_edit/repositories/:repo_id/summary')
  .description("Return resolved JSON of the records to update")
  .params(["repo_id", :repo_id],
          ["uri", [String], "The uris of the records to update"])
  .permissions([:update_resource_record])
  .returns([200, "[(:dartmouth_bulk_container_update_item)]"]) \
  do
    bulk_updates = AspaceSimpleBulkEditItems.new(params[:uri])

    json_response(resolve_references(bulk_updates.aspace_simple_bulk_edit_items, ["archival_object","archival_object::_resolved::instances::sub_container::top_container"]))
  end
  
  Endpoint.post('/plugins/aspace_simple_bulk_edit/repositories/:repo_id/update')
  .description("Return resolved JSON of the records to update")
  .params(["repo_id", :repo_id],
          ["uri", [String], "The uris of the records to update"]
          )
  .permissions([:update_resource_record])
  .returns([200, :updated]) \
  do
    params[:uri].each do |uri_hash|
      ASUtils.json_parse(uri_hash).each do |ao|
        repo_id = params[:repo_id]
        @simple_bulk_edit = AspaceSimpleBulkEditHandler.new(ao, repo_id)
      end
    end
    
    json_response("updated" => @simple_bulk_edit.aspace_simple_bulk_edit_complete, "issues" => @simple_bulk_edit.aspace_simple_bulk_edit_errors)
  end
  
end