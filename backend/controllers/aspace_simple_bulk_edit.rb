require 'aspace_logger'

class ArchivesSpaceService < Sinatra::Base
    
  Endpoint.post('/plugins/aspace_simple_bulk_edit/repositories/:repo_id/summary')
  .description("Return resolved JSON of the records to update")
  .params(["repo_id", :repo_id],
          ["uri", [String], "The uris of the records to update"])
  .permissions([:update_resource_record])
  .returns([200, "[(:aspace_simple_bulk_edit_item)]"]) \
  do
    bulk_updates = AspaceSimpleBulkEditItems.new(params[:uri])

    json_response(resolve_references(bulk_updates.aspace_simple_bulk_edit_items, ["archival_object","archival_object::_resolved::instances::sub_container::top_container"]))
  end
  
  Endpoint.post('/plugins/aspace_simple_bulk_edit/repositories/:repo_id/update')
  .description("Update the selected archival objects (and descendant top containers)")
  .params(["repo_id", :repo_id],
          ["uri", [String], "JSON strings of the edits to apply to each archival object"]
          )
  .permissions([:update_resource_record])
  .returns([200, :updated]) \
  do
    handler = AspaceSimpleBulkEditHandler.new(params[:repo_id])

    params[:uri].each do |uri_hash|
      ASUtils.json_parse(uri_hash).each { |ao| handler.start_update(ao) }
    end

    json_response("updated" => handler.aspace_simple_bulk_edit_complete, "issues" => handler.aspace_simple_bulk_edit_errors)
  end
  
end